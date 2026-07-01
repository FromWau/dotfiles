# Coroutines & Flows

## Structured Concurrency

- Every coroutine has a parent (except the root) — coroutines form a job hierarchy via `CoroutineScope`
- A parent coroutine waits for **all children** to finish before it can complete
- **Cancellation flows downward**: cancelling a parent automatically cancels all its children recursively — no need to track individual jobs
- **Exceptions flow upward**: if a child throws, the exception propagates to the parent, which cancels all sibling children
- Never use `Thread` or fire-and-forget patterns — always launch coroutines within a structured scope (`viewModelScope`, `lifecycleScope`, `coroutineScope {}`)
- Use `coroutineScope {}` (not `CoroutineScope()`) inside suspend functions to create a structured child scope that respects the caller's cancellation
- Avoid `GlobalScope` — it breaks structured concurrency (no parent, no automatic cancellation)
- **`runBlocking`** blocks the thread it runs on. Only two valid uses: (1) non-main background threads like OkHttp interceptors (prefer in-memory caching instead), (2) unit tests to execute suspend functions synchronously. In all other cases, using `runBlocking` is a mistake

## Suspend Functions vs Flows

- **Suspend functions** for single-shot operations (API calls, one-time DB reads, file I/O) — one request, one response
- **Flows** for multiple values over time (Room DB observations, WebSocket streams, timers, sensor data)
- **Never wrap a single API call in a Flow** just to emit `Loading` → `Success`/`Error` — handle loading state in the ViewModel/UI layer (`isLoading = true` before, `false` after the suspend call)
- Prefer `onEach { }.launchIn(scope)` over `launch { flow.collect { } }` for less indentation

## Coroutine Dispatchers

- **`Dispatchers.IO`** — large thread pool (64+ threads). Use for blocking I/O: file read/write, blocking legacy network calls. Many threads can wait in parallel for idle I/O
- **`Dispatchers.Default`** — thread pool = CPU core count. Use for CPU-heavy work: mapping/filtering large lists, complex calculations
- **`Dispatchers.Main`** — single UI thread. For Compose state updates (though `MutableStateFlow` is thread-safe)
- **Main-safety principle**: the responsibility to switch dispatchers belongs *inside* the suspend function, not at the call site. Ktor, Room, and DataStore already switch internally — wrapping their calls in `withContext(Dispatchers.IO)` is redundant and does nothing
- **Use `withContext(Dispatchers.IO)`** only when your own code contains actual blocking (non-suspending) calls:
  ```kotlin
  suspend fun save(data: ByteArray) = withContext(Dispatchers.IO) {
      outputStream.write(data) // blocking — not a suspend fun
  }
  ```
- **Diagnostic**: if everything inside your `withContext` block is already a suspending function, remove it
- **Use `flowOn(Dispatchers.Default)`** for complex flow chains (filter + map + combine) to move the entire upstream off the main thread
- **KMP `commonMain` gotcha**: in `commonMain`, `Dispatchers.IO` is an extension property, not a member of the `Dispatchers` object, so it needs an explicit `import kotlinx.coroutines.IO`. Without that import the JVM/Android compile still resolves `Dispatchers.IO` (it is a real member there), so `:module:jvmTest` passes, but `compileCommonMainKotlinMetadata` fails with `Unresolved reference 'IO'`. Lesson: per-target test tasks are a false green for `commonMain` changes. Validate `commonMain` edits with `./gradlew build` (it runs the metadata compile), not just `:module:jvmTest`.

## Coroutine Advanced Patterns

- **Custom `CoroutineScope` must use `SupervisorJob()`**: `CoroutineScope(SupervisorJob() + Dispatchers.IO)`. Without it, one failed coroutine cancels the whole scope. `viewModelScope` and `lifecycleScope` already do this
- **`withContext(NonCancellable)` for cleanup in `finally` blocks**: when a coroutine is cancelled, it skips all further suspend function calls — including those in `finally`. Wrap critical cleanup (file deletion, stream closing) with `withContext(NonCancellable) { }`. Use sparingly — it loses all cancellation control inside
- **Inject `DispatcherProvider` for testability** — avoid hardcoding `Dispatchers.IO` / `Dispatchers.Default`:
  ```kotlin
  interface DispatcherProvider {
      val main: CoroutineDispatcher
      val io: CoroutineDispatcher
      val default: CoroutineDispatcher
  }
  object StandardDispatchers : DispatcherProvider {
      override val main = Dispatchers.Main
      override val io = Dispatchers.IO
      override val default = Dispatchers.Default
  }
  // In tests: TestDispatchers(testDispatcher) where all fields = testDispatcher
  ```
- **Long blocking operations need periodic cancellation checks**: wrapping a blocking call in `withContext` doesn't make it cancellable mid-execution. For large file reads or long computations, check `currentCoroutineContext().ensureActive()` (or call `yield()`) periodically. `yield()` also yields the thread to other coroutines, while `ensureActive()` does not

## Coroutine & Flow Anti-Patterns

- **Heavy work on main thread**: complex flow chains in `viewModelScope` run on `Dispatchers.Main` by default — use `flowOn(Dispatchers.Default)` or `withContext(Dispatchers.Default)` for CPU-intensive mapping/filtering
- **Navigate before ViewModel finishes**: calling `navigateUp()` immediately after a save cancels `viewModelScope` and kills in-flight coroutines. Fix: either send a one-time event from ViewModel when done, or use an application-scoped `CoroutineScope` for operations that must outlive the ViewModel
- **`launch + join` immediately / `async + await` immediately** — this is sequential, not parallel. Launch all coroutines first, then join:
  ```kotlin
  // WRONG — sequential
  val job1 = launch { updateProfile() }; job1.join()
  val job2 = launch { uploadPicture() }; job2.join()
  // RIGHT — parallel
  val job1 = launch { updateProfile() }
  val job2 = launch { uploadPicture() }
  job1.join(); job2.join()
  ```
- **Catching `CancellationException` in loops**: `catch (e: Exception)` inside a `while(true)` swallows cancellation — the loop never exits. Always call `currentCoroutineContext().ensureActive()` in catch blocks
- **Passing `SupervisorJob()` to `launch {}`**: jobs are NOT inherited to child coroutines — it creates an unrelated parent, not independent siblings. Use `supervisorScope {}` instead. `SupervisorJob()` is only correct when constructing your own `CoroutineScope(SupervisorJob() + dispatcher)`

## Cold vs Hot Flows

- **Cold flows** (`flow {}`, `callbackFlow {}`): do nothing until collected. Each collector gets its own independent execution. Use for lazy, single-consumer operations
- **Hot flows** (`SharedFlow`, `StateFlow`): emit regardless of collectors. Emissions shared across all collectors. If no collector, emissions are lost (SharedFlow) or cached (StateFlow)
- Convert cold → hot with `shareIn(scope, started)` or `stateIn(scope, started, initialValue)`
  - `SharingStarted.Eagerly` — start immediately
  - `SharingStarted.WhileSubscribed(5000)` — share while active subscribers, timeout before stopping
- **`SharedFlow`**: no caching, all emissions matter. Use for one-to-many broadcast events where multiple subscribers must each react independently (e.g. a global auth expiry signal consumed by both a banner and a session manager)
- **`StateFlow`**: caches latest value, new collectors immediately receive it. Use for UI state where only current value matters
- Multiple collectors of a cold flow = multiple independent executions (e.g. double location callbacks). Use `shareIn`/`stateIn` to deduplicate

## ViewModel Patterns

- `StateFlow` / `MutableStateFlow` for observable state
- `Channel(UNLIMITED)` with `receiveAsFlow()` for one-shot events (toasts, navigation)
- `SharedFlow` for one-to-many event streams
- Observe `_state` (MutableStateFlow) in internal flows, not `state` (public StateFlow) to avoid circular dependencies
- Use `launchIn(scope)` for flow collection in ViewModels, `stateIn()` for exposing state
- Use `viewModelScope.launch {}` for fire-and-forget operations (e.g. sending a message)
