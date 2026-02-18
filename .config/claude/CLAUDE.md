# Claude Global Reminders

## Android / Kmp Project
Launch applications: first check for .run/*.xml configs. this get used by android-studio to run the profile.

### Kotlin / KMP Best Practices

**Architecture:**
- Always use **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state
- **Single source of truth**: Local database is the source of truth. Server data flows through sync into local DB, UI observes local DB
- **Layer separation**: Domain (models, repository interfaces, errors) → Data (implementations, DAOs, mappers) → Presentation (ViewModel, State, Action)
- **Dependency direction**: Data → Domain ← Presentation. Domain is the innermost layer — it depends on nothing. Changes in data/presentation must never impact domain

**Clean Architecture Packaging:**
- **Never create a top-level `util` package** alongside `data/domain/presentation` — it becomes an undefined fourth layer with no clear access rules. Every utility function belongs to exactly one layer:
  - Date formatting, string formatting for display → `presentation/util`
  - Generic `Result<D,E>` wrapper, domain-level types → `domain/util`
  - HTTP response code parsing, API error mapping → `data/util`
- Create `util` sub-packages *within* each layer, not as a feature-level sibling

**Abstractions — Only When You Need Two Implementations:**
- Create an interface/abstraction **only if you have or plan to have at least 2 implementations**
- Valid reasons: (1) switching underlying libraries (Ktor vs Retrofit), (2) test doubles (fake implementations for unit tests)
- **Over-abstraction** makes code harder to navigate — clicking through 5+ files to understand a login button is a failure mode
- Don't abstract use cases or mappers just because it feels clean — if there's only ever one implementation, the interface adds noise without value
- If you don't write tests and don't plan to, there's almost never a reason for abstractions beyond repository interfaces

**Use Cases:**
- Use cases should contain **higher-level business logic** — things the user is explicitly aware of doing (registering, saving a note, making a purchase, exporting data)
- **Not every isolated function is business logic** — `DeleteDigitUseCase` that just calls `pin.dropLast(1)` is pointless. That's a utility function, not business logic
- Use cases are valuable when they **combine multiple data sources** (local DB + remote API + sync scheduler) or orchestrate meaningful side effects (save + fire analytics + schedule retry)
- **Use cases vs. Repositories — it's either/or:**
  - Rich Repository with real orchestration logic → use cases that just delegate are pointless overhead
  - Want real use cases → move orchestration into them and remove the redundant repository class
- Good use cases: `StoreTodoUseCase` (insert locally → sync remotely → schedule retry on failure), `RegisterUseCase`, `ExportDataUseCase`
- Use cases that combine data from multiple repositories (e.g. `UserDataSource` + `TodoDataSource`) are cleaner than forcing the logic into either `UserRepository` or `TodoRepository`
- Implementation details (Ktor, Room, WorkManager) should stay hidden behind interfaces — use cases depend on abstractions, not concrete libraries
- **Use case rules**:
  - One use case = one public function. Multiple public functions = multiple use cases
  - Formatting/display logic (date formatting, social stat formatting) is **presentation logic** — belongs in UI mappers, not use cases
  - Domain layer must be **pure Kotlin** — no Android SDK references (e.g. `Patterns.EMAIL_ADDRESS`). Abstract Android-specific things behind interfaces implemented in the data layer
  - Don't create `SuspendUseCase` interfaces unless you actually need test doubles for them
  - Never return error message strings from use cases — return typed error enums, let the ViewModel map to string resources

**Models & Mappers:**
- **Domain model** (`Run`) — what the concept *is* in your app's context. Uses convenient Kotlin types (`Duration`, `LocalDateTime`, wrapper classes). Lives in the domain layer
- **Entity** (`RunEntity`) — optimized for DB storage with primitive/serializable fields. Lives in the data layer
- **DTO** (`RunDto`) — optimized for network serialization, fields match JSON structure. Lives in the data layer
- **UI model** (`RunUi`) — pre-formatted strings for display (`"1.34 km"`, `"05:45"`). Lives in the presentation layer. **Optional** — only create when the UI needs heavily formatted/transformed values; simple cases can use the domain model directly
- **Always have separate DTOs/Entities** even if fields match the domain model — field names are implicitly coupled to JSON/DB schema (implementation details that change independently)
- **Mappers are extension functions** in a separate `mappers` file/package — never inside the model class (companion object)
- Data↔Domain mappers go in the **data layer** (`RunEntity.toRun()`, `RunDto.toRun()`)
- Domain→UI mappers go in the **presentation layer** (`Run.toRunUi()`)
- **Never put mappers in the domain layer** — it would create forbidden dependencies on data/presentation models

**MVI: State vs Actions vs Events:**
- **State** (`data class`): persistent values that affect UI appearance (`isLoading`, `todos`). Survives config changes — re-collected after rotation is expected. Bundle all UI-impacting fields in one state class
- **Actions** (`sealed interface`): user-triggered intents sent **UI → ViewModel** (`ToggleTodo(id)`, `OnSwipeToRefresh`). Pass a single `onAction: (Action) -> Unit` lambda to composables instead of many individual lambdas
- **Events** (`sealed interface`): one-time signals sent **ViewModel → UI** (`ShowSnackbar(message)`, `NavigateToHome`). Use `Channel(UNLIMITED)` + `receiveAsFlow()` — consumed exactly once, not re-fired after config changes
- **Never put one-time things in State** (snackbar messages, navigation triggers) — they re-fire on every config change because State is re-collected. Use Events instead
- Collect events via a lifecycle-aware `observeAsEvents` utility function, not `LaunchedEffect` on a state field

**No Base Classes — Prefer Composition Over Inheritance:**
- **Never create `Base___` classes** (`BaseViewModel`, `BaseActivity`, `BaseFragment`) — they violate single responsibility, hide coupling, and accumulate workarounds over time
- **Don't use inheritance to share code or utilities** — that is not what inheritance is for
- Share behavior via **constructor-injected dependencies** (e.g. inject `AnalyticsTracker` instead of calling `trackScreenView()` in a base `init` block)
- Share utilities via **extension functions**, **top-level functions**, or **small focused classes** with clear responsibility
- Use the **delegation pattern** (`by`) when you need polymorphic hierarchy behavior without inheritance downsides
- Not every ViewModel needs state/action/events — don't force MVI structure on static screens or simple cases
- If inheritance is truly needed for architectural enforcement, name it descriptively (e.g. `MviViewModel`, never `BaseViewModel`) and keep it minimal: no utilities, no shared side effects

**`inline` Functions:**
- `inline` copies the function body to every call site — eliminates function call overhead. Most useful for functions that accept lambdas called in tight loops (like `forEach`, `map`)
- Standard library functions like `forEach`, `map`, `filter` are already `inline` — no need to rewrap them
- **Additional capabilities unlocked by `inline`**:
  - **Suspending lambdas**: an inline function's lambda inherits the coroutine context of the call site — you can call `delay()` inside a non-suspend inline lambda
  - **Non-local returns**: `return` inside an inline lambda returns from the *outer* function, not just the lambda
  - **`reified` generics**: type parameters retain their type info at runtime (normally erased). Required for generic JSON deserialization, `is T` checks, etc.
    ```kotlin
    inline fun <reified T> fromJson(json: String): T = Json.decodeFromString(json)
    ```
- **`crossinline`**: use on a lambda parameter that is executed asynchronously (inside a launched coroutine or thread). Disallows non-local returns since the outer function may have already returned
- **`noinline`**: use on specific lambda parameters in an inline function that you don't want inlined (e.g. large lambda bodies that would bloat bytecode)
- **When to use `inline`**: functions with lambda parameters called frequently. **Don't** add it to large bodies — bytecode size grows at every call site
- **`@JvmInline value class`**: single-field wrapper over a primitive. Compiled to the raw primitive — zero allocation overhead, but gives type safety and the ability to add validation/behavior:
  ```kotlin
  @JvmInline
  value class Month(val number: Int) {
      init { require(number in 1..12) }
  }
  ```

**Kotlin-first Libraries:**
- Prefer Kotlin libraries over Java alternatives
- `kotlinx.serialization` over Gson/Moshi
- `kotlinx.coroutines.flow` over RxJava/LiveData
- `kotlin.time.Instant` / `kotlin.time.Clock` over `java.time`
- `kotlin.uuid.Uuid` over `java.util.UUID`
- `kotlinx.collections.immutable` for UI state lists

**Error Handling:**
- Use custom `Result<D, E : Error>` sealed types — never throw exceptions for expected failures, never pass error messages as strings
- Domain `Error` sealed interface as root type — data layer enums implement it:
  ```kotlin
  // domain layer
  sealed interface Error
  sealed interface DataError : Error {
      enum class Network : DataError { RequestTimeout, NoInternet, PayloadTooLarge, ServerError, Unknown }
      enum class Local : DataError { DiskFull, Unknown }
  }
  enum class PasswordError : Error { TooShort, NoUppercase, NoDigit }
  ```
- Map HTTP status codes → error enums in the **data layer** (repository). Map error enums → `UiText` in the **presentation layer**
- **Never pass error message strings from data/domain** — deciding which string to show is presentation logic
- **`UiText` pattern** for string resources in ViewModels (avoids needing `Context`):
  ```kotlin
  sealed interface UiText {
      data class DynamicString(val value: String) : UiText
      class StringResource(val id: Int) : UiText
  }
  // Extension in presentation layer:
  fun DataError.Network.toUiText(): UiText = when (this) {
      DataError.Network.NoInternet -> UiText.StringResource(R.string.error_no_internet)
      ...
  }
  ```
- `currentCoroutineContext().ensureActive()` before returning errors in catch blocks to respect cancellation
- Never catch `CancellationException` — let it propagate

**Structured Concurrency:**
- Every coroutine has a parent (except the root) — coroutines form a job hierarchy via `CoroutineScope`
- A parent coroutine waits for **all children** to finish before it can complete
- **Cancellation flows downward**: cancelling a parent automatically cancels all its children recursively — no need to track individual jobs
- **Exceptions flow upward**: if a child throws, the exception propagates to the parent, which cancels all sibling children
- Never use `Thread` or fire-and-forget patterns — always launch coroutines within a structured scope (`viewModelScope`, `lifecycleScope`, `coroutineScope {}`)
- Use `coroutineScope {}` (not `CoroutineScope()`) inside suspend functions to create a structured child scope that respects the caller's cancellation
- Avoid `GlobalScope` — it breaks structured concurrency (no parent, no automatic cancellation)
- **`runBlocking`** blocks the thread it runs on. Only two valid uses: (1) non-main background threads like OkHttp interceptors (prefer in-memory caching instead), (2) unit tests to execute suspend functions synchronously. In all other cases, using `runBlocking` is a mistake

**Suspend Functions vs Flows:**
- **Suspend functions** for single-shot operations (API calls, one-time DB reads, file I/O) — one request, one response
- **Flows** for multiple values over time (Room DB observations, WebSocket streams, timers, sensor data)
- **Never wrap a single API call in a Flow** just to emit `Loading` → `Success`/`Error` — handle loading state in the ViewModel/UI layer (`isLoading = true` before, `false` after the suspend call)
- Prefer `onEach { }.launchIn(scope)` over `launch { flow.collect { } }` for less indentation

**Coroutine Dispatchers:**
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

**Coroutine Advanced Patterns:**
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

**Coroutine & Flow Anti-Patterns:**
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

**Cold vs Hot Flows:**
- **Cold flows** (`flow {}`, `callbackFlow {}`): do nothing until collected. Each collector gets its own independent execution. Use for lazy, single-consumer operations
- **Hot flows** (`SharedFlow`, `StateFlow`): emit regardless of collectors. Emissions shared across all collectors. If no collector, emissions are lost (SharedFlow) or cached (StateFlow)
- Convert cold → hot with `shareIn(scope, started)` or `stateIn(scope, started, initialValue)`
  - `SharingStarted.Eagerly` — start immediately
  - `SharingStarted.WhileSubscribed(5000)` — share while active subscribers, timeout before stopping
- **`SharedFlow`**: no caching, all emissions matter. Use for one-to-many broadcast events where multiple subscribers must each react independently (e.g. a global auth expiry signal consumed by both a banner and a session manager)
- **`StateFlow`**: caches latest value, new collectors immediately receive it. Use for UI state where only current value matters
- Multiple collectors of a cold flow = multiple independent executions (e.g. double location callbacks). Use `shareIn`/`stateIn` to deduplicate

**Coroutines & Flows:**
- `StateFlow` / `MutableStateFlow` for observable state
- `Channel(UNLIMITED)` with `receiveAsFlow()` for one-shot events (toasts, navigation)
- `SharedFlow` for one-to-many event streams
- Observe `_state` (MutableStateFlow) in internal flows, not `state` (public StateFlow) to avoid circular dependencies
- Use `launchIn(scope)` for flow collection in ViewModels, `stateIn()` for exposing state
- Use `viewModelScope.launch {}` for fire-and-forget operations (e.g. sending a message)

**File I/O — Basics:**
- `java.io.File` is just a **reference/pointer** to a path — no I/O happens on construction. The file/folder may not even exist
- On Unix, folders are also files — `File` can reference both. Check `isDirectory()` to distinguish
- `file.mkdirs()` creates **all missing parent directories** before creating a file (use over `mkdir()` for nested paths)
- Relative paths: `.` = current working directory, `..` = parent directory, `/prefix` = absolute root
- Recursive file traversal: check `child.isDirectory` to recurse into subdirectories

**File I/O — Buffered Reading and Writing:**
- Raw byte-by-byte file reading is slow — each `read()` call translates to a low-level OS system call. Reading an 80MB file byte-by-byte = ~80 million system calls (~37 seconds)
- **Use `BufferedReader` / `BufferedWriter`** — reads large chunks into memory at once, then processes from memory. Same 80MB file: ~0.75s (50x+ faster)
  ```kotlin
  FileInputStream(file).bufferedReader().use { reader ->
      // processes from in-memory buffer — not an OS call per byte
  }
  ```
- High-level Kotlin extension functions like `file.readBytes()`, `file.readText()` already use buffering internally — no need to manually wrap them
- **Use low-level buffered APIs when** you need to process a file **gradually line by line** without loading the entire contents into memory (large log files, data streams). Only one line is in memory at a time; the previous is GC-able after each iteration
- **Use `readBytes()` / `readText()`** only when you actually need the entire file content at once (e.g. loading an image for processing)

**DataStore Preferences (Android):**
- Use **DataStore Preferences** over SharedPreferences — modern, coroutine-based, process-safe
- For sensitive data (auth tokens, credentials): encrypt with **Android KeyStore** (AES/CBC/PKCS7)
- Encryption pattern: JSON serialize → encrypt bytes → Base64 encode → write to DataStore output stream
- Decryption: read bytes → Base64 decode → decrypt → JSON deserialize
- Implement a custom `Serializer<T>` with `writeTo` and `readFrom` functions
- Reference DataStore as a Context extension property:
  ```kotlin
  val Context.dataStore by dataStore("user_prefs", UserPreferencesSerializer)
  ```
- Set `randomizedEncryptionRequired = true` on the KeyStore key so the same plaintext produces different ciphertext each time (via random IV)
- Set `setUserAuthenticationRequired(false)` unless you specifically need biometric unlock of the key
- **KMP note**: DataStore API is cross-platform; encryption is platform-specific. The Android KeyStore approach only works on Android — iOS and desktop require platform-native equivalents

**Room Database:**
- Use `@Transaction` on queries returning `@Relation` types
- Prefer join tables over embedded lists for many-to-many relationships
- Composite primary keys via `primaryKeys = [...]` in `@Entity`
- `OnConflictStrategy.REPLACE` for upsert operations
- Delete dependents before parents (foreign key order)

**KMP Permission Handling (Moko Permissions):**
- Use **Moko Permissions** library (`moko-permissions-compose`) for shared iOS + Android permission handling
- `PermissionsController` is the central unit — check state, request, open app settings
- Create in the composable via `rememberPermissionsControllerFactory()` + `factory.createPermissionsController()`
- Add `BindEffect(controller)` composable to make the controller lifecycle-aware (syncs permission dialog lifecycle with ViewModel)
- Pass `controller` to ViewModel constructor for requesting permissions from ViewModel
- `controller.getPermissionState(Permission.RECORD_AUDIO)` — returns `PermissionState` (Granted, Denied, DeniedAlways, NotDetermined)
- `controller.providePermission(permission)` — requests if not granted; throws on denial:
  - `DeniedAlwaysException` — permanently denied. **Catch this BEFORE `DeniedException`** (it's a subclass)
  - `DeniedException` — denied this time
  - `RequestCanceledException` — Android only (notification permissions)
- `controller.openAppSettings()` — opens app settings so user can manually grant
- **Android**: declare `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` in `AndroidManifest.xml`
- **iOS**: add `NSMicrophoneUsageDescription` key with description text to `Info.plist` in Xcode
- After permanent denial: show an "Open App Settings" button; after re-grant, check state on next launch

**Dependency Injection:**
- Use Koin with `singleOf(::Impl) bind Interface::class`
- Constructor injection over field injection

**ViewModel Lifecycle:**
- Use `onCleared()` for cleanup (session logout, closing resources)
- Don't pass data through navigation routes — use a central `Session` singleton

### Compose State Retention

**Choosing the right state API:**
- `remember { }` — survives recomposition only. Use for transient UI state (animation values, scroll position)
- `retain { }` — survives recomposition + configuration changes. Does **not** require serialization. Use for non-serializable objects that must survive rotation (e.g. ExoPlayer instance, Bitmap). Does **not** survive process death
- `rememberSaveable { }` — survives recomposition + config changes + process death. **Requires** the value to be serializable/parcelable. Use for user input, form state, selected IDs
- **Default to ViewModel + `SavedStateHandle`** for real app state — better testability, architecture, and process death survival
- `retain` is acceptable for quick local UI state that doesn't need process death survival, or for library code that shouldn't couple to ViewModels

**`RetainedEffect` vs `DisposableEffect`:**
- `DisposableEffect` `onDispose` fires on **any** composition exit (including config changes)
- `RetainedEffect` `onRetire` fires only when leaving composition for reasons **other than** config changes — use for resources that should survive rotation but clean up on back navigation (e.g. ExoPlayer: init in body, `player.release()` in `onRetire`)

### Compose UI State Modeling

**Immutability:**
- All `data class` types used in Compose UI state must be annotated `@Immutable`
- All `List` types in UI state must be `ImmutableList` (from `kotlinx.collections.immutable`)

**Sealed Interface for Sub-States / Pages:**
- Use `sealed interface` to model distinct UI phases (Loading/Loaded) or multi-page flows:
```kotlin
@Immutable
sealed interface Page {
    data class Summary(val items: ImmutableList<Item>) : Page
    data class Details(val item: Item) : Page
    data object Done : Page
}
```

**Root UI State Pattern:**
- The root state `data class` must be constructable with **no parameters** (all fields have defaults)
- Store each page/sub-state as a separate field so data is **retained** when navigating between pages — the ViewModel controls clearing
- Include a `Page` enum that mirrors the sealed interface variants for tracking the current page:
```kotlin
@Immutable
data class HomeState(
    val pageSummary: Page.Summary = Page.Summary(),
    val pageDetails: Page.Details = Page.Details(),
    val currentPage: Page = Page.Summary,
) {
    enum class Page { Summary, Details, Done }
}
```
- This keeps page data alive across navigation; the ViewModel decides when to reset individual page state

### Compose Form Focus & Keyboard Management

**IME action flow for multi-field forms:**
- All intermediate fields: `KeyboardOptions(imeAction = ImeAction.Next)` + `KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })`
- Last field: `KeyboardOptions(imeAction = ImeAction.Done)` + `KeyboardActions(onDone = { focusManager.clearFocus(); submitForm() })`
- All text fields in a form must be `singleLine = true` (multi-line shows Enter key, not the IME action button)

**Focus management APIs:**
```kotlin
val focusRequester = remember { FocusRequester() }
val focusManager = LocalFocusManager.current

// Assign to TextField:
TextField(modifier = Modifier.focusRequester(focusRequester), ...)

// Programmatically focus (e.g. on button click):
focusRequester.requestFocus()

// Move to next field (in onNext keyboard action):
focusManager.moveFocus(FocusDirection.Down)

// Dismiss keyboard (in onDone keyboard action):
focusManager.clearFocus()
```

### UX Best Practices

1. **Touch targets**: Always put clickable icons inside `IconButton` — never make a raw `Icon` clickable. Default `IconButton` touch target is 48dp. For custom small clickables, manually set minimum touch target size
2. **Validate text fields on focus loss**, not on submit — users should see errors before hitting the button
3. **IME actions**: Use `ImeAction.Next` to move between fields, `ImeAction.Done` on the last field — never leave the default `Enter` for email/password fields
4. **Single primary action per screen** — secondary actions should use `OutlinedButton` or `TextButton` to reduce visual prominence
5. **Primary action placement** — bottom-right of the screen (closest to right thumb). Destructive confirm buttons should use error color
6. **Destructive dialog wording** — use specific action verbs ("Discard", "Delete") not generic labels ("Confirm", "OK")
7. **Character counters** for text fields with length limits — show real-time count, disable submit when exceeded
8. **Color contrast** — minimum 4.5:1 ratio (WCAG AA) for normal text. Use a contrast checker tool during design
9. **Defer permission requests** — only request permissions at the moment they are needed (e.g. microphone when recording starts, not on app launch)
10. **Process death restoration** — use `SavedStateHandle` in ViewModels for screens where users invest significant input time before saving

### Pagination

**Manual pagination over Jetpack Paging library** for single data sources (API or DB, not both):
- Full ownership of the list — easy to mutate individual items (e.g. toggle like)
- Use Jetpack Paging only when paginating from both local DB and remote simultaneously

**Generic `Paginator<Key, Item>` class** — reusable across all view models:
- `Key` = page identifier type (e.g. `Int` for page number, `Instant` for cursor-based)
- `Item` = API response type
- Constructor lambdas: `initialKey`, `onLoadUpdated`, `onRequest(nextKey) → Result<Item>`, `getNextKey(currentKey, result) → Key`, `onError`, `onSuccess(result, newKey)`, `endReached(currentKey, result) → Boolean`
- `loadNextItems()` guards against concurrent requests and already-reached end
- `reset()` resets key and `endReached` flag to restart pagination

**Scroll-to-end detection** in the composable:
```kotlin
LaunchedEffect(products) {
    snapshotFlow { lazyListState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
        .distinctUntilChanged()
        .collect { lastIndex ->
            if (lastIndex == state.products.lastIndex) viewModel.loadNextItems()
        }
}
```

**Loading indicator** — add as last `item {}` in `LazyColumn` when `isLoadingMore` is true

### Jetpack Compose Performance

**1. Understand Compose's Three Phases — Defer State Reads:**
Compose processes each frame in three phases: **Composition → Layout → Drawing**. Changes that only affect drawing (rotation, scale, alpha, translation) should not trigger recomposition. Use `Modifier.graphicsLayer` to defer state reads to the drawing phase:
```kotlin
// BAD — reads state during composition, recomposes every frame
Icon(modifier = Modifier.rotate(rotation.value))

// GOOD — reads state only in the drawing phase, zero recompositions
Icon(modifier = Modifier.graphicsLayer { rotationZ = rotation.value })
```

**2. No Side Effects Directly in Composition:**
Never execute non-composable lambdas/functions directly in a composable body — they re-execute on every recomposition. Use effect handlers:
```kotlin
// BAD — fires on every recomposition where count >= 10
if (count >= 10) { onThresholdReached(count) }

// GOOD — only fires when count actually changes
LaunchedEffect(count) {
    if (count >= 10) { onThresholdReached(count) }
}
```

**3. Use `key()` for Reorderable Non-Lazy Layouts:**
Not just for `LazyColumn` — use `key()` in any layout where items reorder (dashboards, dynamic forms) so Compose moves composables without recomposing:
```kotlin
// BAD — recomposes both items on every swap
fields.forEach { field -> FormFieldItem(field) }

// GOOD — Compose moves by identity, skips recomposition
fields.forEach { field ->
    key(field.id) { FormFieldItem(field) }
}
```

**4. Don't Pass Entire MVI State to Child Composables:**
Passing a whole state data class means the child recomposes when any field changes. Pass only the specific fields each child needs:
```kotlin
// BAD — UserHeader recomposes when notificationCount changes
UserHeader(state = screenState)

// GOOD — only recomposes when its own data changes
UserHeader(username = screenState.username, followerCount = screenState.followerCount)
```
Exception: acceptable if the child uses 80-90%+ of the state fields.

**Recomposition notes:**
- Only **structural changes** (UI tree changes) require recomposition — layout/draw changes don't have to
- Lambdas are compared by **reference**, not value — a recreated lambda triggers recomposition even if its body is identical
- Use `rememberUpdatedState(value)` to freeze a lambda reference while keeping its return value current (prevents recomposition caused by frequently-changing captured values)
- Remember stable values (e.g. IDs) without keys — `val id = remember { person.id }` — so lambdas that capture them aren't recreated on every recomposition
- For lists where individual items change independently, use `mutableStateListOf<T>()` in the ViewModel instead of a `List<T>` in the state class — Compose can then track each item separately and skip unaffected items
- **Don't premature-optimize recompositions** — only investigate if you have measurable UI jank. Use Layout Inspector's skip counts (gray numbers) to diagnose

**5. Main Safety — `withContext(Dispatchers.IO)` for Blocking Calls:**
`viewModelScope` uses `Dispatchers.Main`. Blocking operations freeze the UI even inside a coroutine. Switch dispatchers inside the suspend function, not at the call site:
```kotlin
// BAD — blocks the main thread
suspend fun loadUserData(): UserData {
    val content = readLargeFile() // blocking
    return processData(content)   // blocking
}

// GOOD — main-safe
suspend fun loadUserData(): UserData = withContext(Dispatchers.IO) {
    val content = readLargeFile()
    processData(content)
}
```

### Stateful vs Stateless Composables

**Default: always stateless.** ViewModel handles all state — even form input. This makes all UI mockable, testable, and previewable.

- **Stateless**: receives state as parameters, exposes lambdas for changes. State lives in ViewModel. Full control over when/how state updates. Business logic testable with unit tests
- **Stateful**: composable manages its own `remember { mutableStateOf(...) }` internally. Self-contained but state can't be controlled or reset from outside — only testable with expensive UI tests

**Only use stateful composables for purely internal UI behavior** that will never need external control:
- Dropdown open/close
- Animation state
- Drag state tightly bound to the UI

**Never use stateful for:**
- Text field content — ViewModel must own it so it can validate, reset, or pre-fill
- Any state a ViewModel might need to read or mutate

**If you do use local `remember`:** use `rememberSaveable` for anything that should survive config changes (rotation, theme switch)

### Compose UI Tips

**Auto-sizing text** — use `BasicText` with `autoSize` instead of manually mapping `WindowSizeClass` to SP values:
```kotlin
BasicText(
    text = "Hello",
    style = TextStyle(/* ... */),
    maxLines = 1,
    autoSize = TextAutoSize.StepBased(
        minFontSize = 24.sp,
        maxFontSize = 38.sp,
        // stepSize defaults to 0.25.sp
    )
)
```
- Auto-size scales based on the **container size** — requires a constrained height (e.g. `maxLines`) to actually scale down
- Without `maxLines`, text wraps freely and always uses max font size

## Terminal
```

### Json formatting/selection
Use `jq` to format json output or to query against the json
```

