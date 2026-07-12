# Streaming Server Concurrency Patterns

Compositional recipes for a server (or any producer) that runs independent work
and streams results to a consumer. These build on the fundamentals in
`coroutines-and-flows.md` — read that first for structured concurrency,
dispatchers, and cold/hot flows.

The thesis: don't memorize APIs, recognize a few **shapes** made of flows +
channels + structured concurrency and reuse them. Each pattern below changes one
stage of the pipeline; they stack.

Patterns: [1] coroutines are cheap · [2] generator · [3] fan-in ·
[4] server-side ordering (+ cold-flow pitfall) · [5] client-side ordering ·
[6] timeouts · [7] hedging · [8] back-pressure · [9] built-in operators.

Running example: an assistant server resolves a list of `ModelPart`s (each a
`Text` or a `ToolCall` that fans out to a backend), and streams string chunks.

## 1. Coroutines Are Cheap — Launch Freely

A chain of 100k coroutines, each owning a `channelFlow`, passing one value
end-to-end, completes (setup + teardown included) in ~100ms. Unlike JVM threads,
coroutines don't need a pool — starting one on a server carries no thread-sized
penalty. So structure code around "launch a coroutine per unit of work" without
reaching for an executor. The patterns below all lean on this.

## 2. Generator — A Function Returning a Flow

A generator is just `fun ...(): Flow<T>`. Trivial in shape, but it lets you
**emit each result as soon as it is ready** instead of collecting everything into
a list first — which lowers time-to-first-byte and lets the consumer act on early
chunks.

```kotlin
fun resolve(part: ModelPart): Flow<String> = flow {
    when (part) {
        is ModelPart.Text -> emit(part.text)
        is ModelPart.ToolCall -> callTool(part).forEach { emit(it) } // chunk by chunk
    }
}
```

This shape reappears in every pattern below — internalize it.

## 3. Fan-In — Concurrent Producers, One Stream

Independent tools have no data dependency, so run them concurrently and merge into
a single output stream. `channelFlow` starts a flow backed by a channel; each
launched child can `send` into it.

```kotlin
fun resolveAll(parts: List<ModelPart>): Flow<String> = channelFlow {
    for (part in parts) {
        launch { resolve(part).collect { send(it) } } // each tool in its own child
    }
}
```

Lowers overall latency (tools run in parallel). Cost: **output is interleaved** —
whoever is ready sends first, so order is lost. Restore it with pattern 4 or 5.

## 4. Server-Side Ordering (+ the Cold-Flow Pitfall)

Keep the concurrency of fan-in but restore original order: start every tool with
`async` (concurrent), then `await` them in order and emit.

```kotlin
fun resolveOrdered(parts: List<ModelPart>): Flow<String> = flow {
    coroutineScope {
        val deferreds = parts.map { part ->
            async { resolve(part).toList() } // terminal op runs the work HERE
        }
        for (deferred in deferreds) {
            deferred.await().forEach { emit(it) }
        }
    }
}
```

**Pitfall — the single most common flow bug here.** Write `async { resolve(part) }`
instead and everything runs sequentially again, latency back to baseline. Why:
`resolve` returns a *cold* Flow, so the `async` block does no tool work — it just
returns a blueprint. The work only happens when you collect, which is later, one
`await` at a time. Fix: call a terminal operator (`toList()`, `collect { }`)
**inside** the `async` so the work actually runs concurrently there. See the
cold/hot section of `coroutines-and-flows.md`.

Tradeoff: order is restored, but the consumer sees nothing until the first part's
chunks are ready — you trade time-to-first-byte for order. If the consumer can
reorder, prefer pattern 5.

## 5. Client-Side Ordering — Sequence Numbers + Done Markers

Let the server emit as-ready (lowest latency) and have the consumer reassemble
order from metadata. Tag each chunk with a sequence number and a per-source
terminator.

```kotlin
data class Chunk(
    val seq: Int,
    val payload: Payload,
    val done: Boolean, // last chunk for this seq — consumer can't infer it otherwise
)
```

The consumer places a slot per `seq` (e.g. a UI placeholder) and fills chunks as
they arrive. The `done` marker is essential: without a terminator the consumer
can't know whether more chunks for that `seq` are still coming.

## 6. Timeouts — Same Pattern, Different Granularity

A consumer won't wait forever, so bound the work. `withTimeout` throws
`TimeoutCancellationException`; `withTimeoutOrNull` returns `null` instead (usually
cleaner). Apply the same wrap at whichever level you need.

```kotlin
// Whole request — blunt: any tool overrunning kills everything.
withTimeout(requestDeadline) {
    resolveAll(parts).collect { send(it) }
}

// Per tool — finer: a slow tool drops out, the rest still complete.
val deferreds = parts.map { part ->
    async {
        withTimeoutOrNull(toolDeadline) { resolve(part).toList() }.orEmpty()
    }
}
```

If you catch `TimeoutCancellationException` by hand instead of using
`withTimeoutOrNull`, catch *that* type specifically — never a bare
`CancellationException`, which would swallow legitimate cancellation (see the
anti-patterns in `coroutines-and-flows.md`).

## 7. Request Hedging — Fastest of N Wins

When a backend has variable/flaky latency, send the same request N times and take
whichever finishes first; structured concurrency cancels the losers for free.

```kotlin
suspend fun hedged(part: ModelPart): List<String> =
    channelFlow {
        repeat(REPLICAS) {
            launch { send(resolve(part).toList()) } // duplicate attempts
        }
    }.first() // first result wins; .first() cancels the channelFlow → losers cancelled
```

Cuts tail latency and eliminates most timeouts. Cost: N× load — bound `REPLICAS`
and prefer spreading attempts across replicas. Many frameworks (gRPC) have this
built in; the above is the poor-man's version when they don't.

## 8. Back-Pressure & Buffering — Don't Overwhelm a Slow Consumer

Flows back-pressure **by default**: the producer suspends until the collector has
consumed the previous value. A slow consumer (another server doing heavy work, a
device low on memory) automatically throttles the server — no unbounded buffering,
no OOM. But strict lock-step wastes time: the server sits idle while the consumer
processes, then has to produce the next item from scratch.

`buffer(n)` decouples them by `n` slots — the server runs ahead while the consumer
works, still bounded so it can't flood a consumer that falls behind.

```kotlin
serverFlow
    .buffer(2)                 // produce up to 2 items ahead of the consumer
    .collect { slowConsumer(it) }
```

In the demo this cut a slow-consumer run from ~8s to ~5s. Tune capacity to your
latency profile — there's a sweet spot between lock-step and unbounded.

## 9. Encapsulation — Built-In Operators for the Common Shapes

Once fan-in and sequential-emit repeat, replace the boilerplate with the stdlib
operators over a `Flow` of inputs:

```kotlin
parts.asFlow().flatMapMerge { resolve(it) }  // concurrent fan-in (like pattern 3)
parts.asFlow().flatMapConcat { resolve(it) } // sequential, in order (like pattern 2 over a list)
```

- `flatMapMerge` — collects the inner flows concurrently; `concurrency` parameter
  defaults to `DEFAULT_CONCURRENCY` (16).
- `flatMapConcat` — sequential: the next input doesn't start until the previous
  inner flow finishes. It gives **order but not concurrency**, so it does *not*
  replace pattern 4 (concurrent *and* ordered) — that still needs the manual
  `async` + ordered `await`.
- Caveat: both are `@FlowPreview` (or `@ExperimentalCoroutinesApi` depending on
  version) — they need an opt-in and carry weak source/binary compatibility
  guarantees. Fine for app code; think twice before exposing them in a library API.

---

Distilled from the talk "Concurrency Patterns for High-Performance Content
Servers" (Google Ads), itself modeled on Rob Pike's Go Concurrency Patterns —
patterns over APIs.
