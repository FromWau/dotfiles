# Concurrent Injectable Service (State-Machine Pattern)

How to architect a service/manager/controller that:

- holds an internal lifecycle state machine (`Idle` -> `Starting` -> `Running` -> `Stopping` -> `Stopped`),
- exposes `run()` / `stop()` (or `start()`/`connect()`/etc.),
- is injected as a singleton, so those functions can be called **in parallel by multiple threads**,
- returns a typed `Result<S, E : IError>` so callers know what happened.

The recommended shape is a **single-owner command channel** (actor-style): one coroutine owns the state, callers send it commands. This doc builds that out end to end; the two lock-based alternatives are noted only where they genuinely fit.

## The one principle: guard the transition, not the work

A lifecycle service has two kinds of steps with opposite locking needs:

- **Transitions** (`Idle -> Starting`): tiny, must be atomic. Only one caller may win.
- **Work** (the actual startup / the running loop / teardown): slow, blocking or suspending, must stay cancellable.

Every correct design makes the *transition* the critical section and keeps the *work* outside it. Every broken design conflates them.

## Use the single-owner command channel

This is the pattern to reach for, and the rest of this doc builds it out: one coroutine owns all the state, and `run()`/`stop()` are commands sent to it over a `Channel`. Transitions become a fold over a command stream, reasoned about sequentially, with no lock to forget and no shared mutable state to guard. For a coroutine codebase with a real lifecycle state machine it is the cleanest fit.

Two other models exist. Reach for them only in the narrow cases where single-owner genuinely does not apply:

- **`Mutex` + suspend fun** - short `withLock` around the transition, work in a launched `Job`. Its one draw is that the typed result falls out of the function return instead of needing a reply slot (see the ask pattern below). But it invites a deadlock single-owner avoids: if `stop()` holds the lock across `cancelAndJoin()` while self-terminating work tries to take that same lock to record its end, the two wait on each other. `Mutex` is not `synchronized` (it is suspending, non-reentrant, cancellation-cooperative), so declining it is a design choice, not a limitation.
- **`AtomicReference` + CAS** - `compareAndSet` claims the transition. Only when you are in pure blocking / Java-interop code with no coroutines at all.

Preferring message-passing over shared-state-plus-lock is a legitimate call (CSP / actor model), and for a state machine the single-owner channel maps onto the problem best: state is confined to one place, so there is simply nothing to contend on.

## Typed `Result` means no fire-and-forget - use the ask pattern

A `suspend fun`'s return value *is* the typed `Result`: the reply path is the function return, errors ride the caller's stack. A bare command channel throws that away. To get a value back, attach a one-shot reply slot to each command and await it:

```kotlin
private sealed interface Command {
    data class Run(val ack: CompletableDeferred<Result<Unit, StartError>>) : Command
    data class Stop(val ack: CompletableDeferred<Result<Unit, StopError>>) : Command
}

suspend fun run(): Result<Unit, StartError> {
    val ack = CompletableDeferred<Result<Unit, StartError>>()
    commands.send(Command.Run(ack))
    return ack.await()
}
```

That is the tax on single-owner: you hand-rebuild the return channel a suspend fun gives for free. It is a standard idiom, not a hack - just know that is what you are paying for the confinement.

## The decision that sets the difficulty

What does `run()`'s `Result` report? This, not the locks-vs-channels aesthetic, picks the design.

- **Acceptance** (`Ok` = "start initiated", `Err(AlreadyRunning)` = wrong state): the loop completes the ack **within its own command turn**. Cleanest. Startup failures surface later via `state`.
- **Startup outcome** (`Ok` only once `Running` is reached, `Err(Failed)` if startup threw): the ack completes at the end of the same turn, after `startUp()` has run inline in the loop. Still clean, because the loop is single-threaded (see "Why it holds up").
- **Abort a slow startup mid-flight**: the only case that forces the heavier interruptible variant (run startup in its own job, `Stop` cancels it, `run()` returns `Err(Cancelled)`). Avoid unless actually required.

## Reference implementation

Semantics below: `run()` returns `Ok` once state has reached `Running` (startup done), `Err(AlreadyRunning)` if not idle, `Err(Failed)` if startup threw. Single owner, no locks, typed `Result` on both entry points, correct under parallel callers.

```kotlin
class WorkerService(
    private val scope: CoroutineScope, // CoroutineScope(SupervisorJob() + Dispatchers.Default)
) {
    enum class State {
        Idle,
        Starting,
        Running,
        Stopping,
        Stopped,
    }

    sealed interface StartError : IError {
        data object AlreadyRunning : StartError
        data class Failed(val cause: Throwable) : StartError
    }

    sealed interface StopError : IError {
        data object NotRunning : StopError
    }

    private sealed interface Command {
        data class Run(val ack: CompletableDeferred<Result<Unit, StartError>>) : Command
        data class Stop(val ack: CompletableDeferred<Result<Unit, StopError>>) : Command
        data class WorkEnded(val cause: Throwable?) : Command // internal: work ended on its own (finished or crashed)
    }

    private val _state = MutableStateFlow(State.Idle)
    val state: StateFlow<State> = _state.asStateFlow()

    private val commands = Channel<Command>(Channel.UNLIMITED)

    init {
        scope.launch {
            var job: Job? = null
            for (cmd in commands) {
                when (cmd) {
                    is Command.Run -> {
                        val result = when (_state.value) {
                            State.Idle, State.Stopped -> {
                                _state.value = State.Starting
                                try {
                                    startUp() // bounded setup; loop is busy, other cmds wait
                                    job = launch { runWork() }
                                    _state.value = State.Running
                                    Ok(Unit)
                                } catch (e: Exception) {
                                    currentCoroutineContext().ensureActive() // propagate if scope was cancelled
                                    _state.value = State.Stopped
                                    Err(StartError.Failed(e))
                                }
                            }
                            else -> Err(StartError.AlreadyRunning)
                        }
                        cmd.ack.complete(result)
                    }

                    is Command.Stop -> {
                        val result = when (_state.value) {
                            State.Running -> {
                                _state.value = State.Stopping
                                job?.cancelAndJoin()
                                job = null
                                _state.value = State.Stopped
                                Ok(Unit)
                            }
                            else -> Err(StopError.NotRunning)
                        }
                        cmd.ack.complete(result)
                    }

                    is Command.WorkEnded -> {
                        if (_state.value == State.Running) {
                            job = null
                            _state.value = State.Stopped // model State as a sealed interface with Failed(cmd.cause) to keep the cause
                        }
                    }
                }
            }
        }
    }

    suspend fun run(): Result<Unit, StartError> {
        val ack = CompletableDeferred<Result<Unit, StartError>>()
        commands.send(Command.Run(ack))
        return ack.await()
    }

    suspend fun stop(): Result<Unit, StopError> {
        val ack = CompletableDeferred<Result<Unit, StopError>>()
        commands.send(Command.Stop(ack))
        return ack.await()
    }

    private suspend fun startUp() {
        // bounded initialization
    }

    private suspend fun runWork() {
        val cause: Throwable? =
            try {
                // long-running work; returns when finished, throws on failure
                null
            } catch (e: Exception) {
                currentCoroutineContext().ensureActive() // cancelled by stop() -> rethrow; stop() owns that transition
                e // genuine failure
            }
        commands.send(Command.WorkEnded(cause)) // clean finish or failure, never cancellation
    }
}
```

`Result` / `Ok` / `Err` above map to your own `Result<S, E : IError>` sealed type. `state: StateFlow<State>` is the observable side-channel for anything that just wants to watch, not command.

## Why it holds up

- **Transient states are intra-turn.** Because one command is handled at a time, no *other* command can observe `Starting` or `Stopping` - which is why `Stop` only guards on `Running`, not `Starting`. They still emit on `state`, so external observers see the full `Idle -> Starting -> Running` progression; they just cannot cause a race. The transient states stop being a concurrency hazard and become pure observability.
- **The one tradeoff, stated plainly:** `startUp()` runs *inside* the loop turn, so a concurrent `stop()` / second `run()` queues behind it and its ack completes only after startup finishes. For "accepted and now `Running`" semantics that is correct - you cannot stop what is not up yet. Only "abort a slow startup" needs the interruptible variant.
- **`WorkEnded` closes the machine honestly.** `runWork()` is a child of the loop coroutine, so an uncaught throw would cancel the loop and silently kill the service. Reporting termination back as an internal command keeps every `_state` write inside the one owner and gives the machine an honest `Running -> Stopped` edge for when the work finishes or crashes on its own (model `State` as a sealed interface with a `Failed(cause)` case if you need to carry the crash cause). The `Stop` and `WorkEnded` interleavings are consistent either way (FIFO channel + the `if (_state.value == Running)` guard).
- **Scope ownership:** give the injected scope a `SupervisorJob` so one crash cannot propagate upward, and cancel that scope on service disposal to tear everything down structurally.

## Common miss: a handler that throws outside its `try` hangs the whole service

Loop survival is the whole ballgame. Every entry point blocks on `ack.await()`, so when the owner coroutine dies the service does not return an error, it **hangs forever** - and every future `run()`/`stop()` hangs with it. `WorkEnded` guards the *work job*; you must also guard the *command handlers themselves*.

The trap is subtle because it hides in code that looks harmless: it is natural to do the "real" work in a `try` but resolve dependencies or build helpers *just before* it, assuming those can't fail. They can - a DI lookup (`scope.get<Foo>()`), a lazy property, a builder that validates its input - and that throw escapes the handler, unwinds `for (cmd in commands)`, and kills the loop with the ack still pending.

```kotlin
// WRONG - resolution sits outside the try; a get() throw escapes the handler and kills the loop
is Command.Serve -> {
    val server = RpcServer(scope.get<Daemon>(), scope.get<Registry>()) // can throw -> loop dies
    cmd.ack.complete(runCatching { server.start(); Ok(server.port) }.getOrElse { Err(BindFailed(it)) })
}

// RIGHT - the entire fallible body, resolution included, is inside the protected region
is Command.Serve -> cmd.ack.complete(
    try {
        val server = RpcServer(scope.get<Daemon>(), scope.get<Registry>()) // now guarded
        server.start()
        Ok(server.port)
    } catch (e: Exception) {
        currentCoroutineContext().ensureActive()
        Err(BindFailed(e))
    },
)
```

Rule of thumb: in a command handler, everything from "read the current state" onward that can throw belongs inside the region whose only exits are `ack.complete(...)`. If a handler can throw without completing its ack, the machine is one unlucky call away from a permanent hang. (If you would rather not audit every handler, wrap the `when` body in a `try` that does `cmd.ack.completeExceptionally(t)` and re-throws only on cancellation - the caller then gets an exception instead of a hang. The per-handler discipline above is cleaner and keeps typed errors; the outer net is a backstop.)

## Cancellation: `ensureActive()` over `catch (CancellationException)`

Both aim at "do not swallow cancellation," but they key off different things:

- `catch (CancellationException) { throw e }` keys off the **exception type**: "was the thing thrown a `CancellationException`?"
- `currentCoroutineContext().ensureActive()` keys off the **job state**: "is my Job cancelled right now?" If so it throws the cancellation cause; otherwise returns.

`ensureActive()` is strictly stronger, because **cancellation often surfaces as a non-`CancellationException`.** When a coroutine is cancelled mid-I/O the resource is torn down and the in-flight call throws a domain exception (`IOException`, `SocketException`, `SQLiteInterruptedException`), not a CE. The type-based catch sails past that into the general handler and swallows the cancellation; `ensureActive()` still throws because it checks job state. In `runWork()` above, without it a `stop()`-triggered `IOException` would be reported as `WorkEnded(cause)` - a spurious "work died on its own" racing the `stop()` transition.

`ensureActive()` is also more permissive where you want it: a `withTimeout` firing throws `TimeoutCancellationException` but only cancels its inner scope. `ensureActive()` sees the outer job still active and lets it fall through so you can handle the timeout locally; `catch (CancellationException) { throw e }` would rethrow it and take out your coroutine. Stronger on real cancellation, softer on local timeouts. Use it. (`CancellationException` is itself an `Exception`, so it still lands in `catch (e: Exception)` and gets rethrown by `ensureActive()` when the job is cancelled - the CE case stays covered.)

Never combine `catch (CancellationException) { throw e }` *and* `ensureActive()`: the CE-rethrow defeats local timeout handling, so it is the wrong combination, not extra safety.

## Pitfalls checklist

- Do not hold a lock (or block the owner loop) across the actual start/stop *work* - only across the transition.
- Do not let the work `Job` mutate `_state` or complete an ack directly; report back to the owner so all state writes stay in one place.
- Keep **every fallible step inside the handler's protected region** - dependency/handle resolution (`scope.get<>()`) and object construction too, not just the core start/stop work. A throw that escapes a command handler kills the owner loop and hangs every future call on `ack.await()`. See "Common miss" above.
- Do not forget `SupervisorJob` on the scope, or one work crash cancels the whole service.
- Do not use `catch (CancellationException)` where `ensureActive()` belongs.
- Do not reach for the deprecated `actor { }` builder (`@ObsoleteCoroutinesApi`); a plain `launch` consuming a `Channel` is the current idiom.
- `run()`/`stop()` are idempotent by construction (wrong-state -> typed `Err`), so callers never need to coordinate.
