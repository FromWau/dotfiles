# Library & API Design — lessons from a mature library's internals

The principles here are altitude-independent, like the rest of this skill. The
running example is **OkHttp** (an HTTP client older than Kotlin 1.0, deliberately
coroutine-free to keep serving Java callers), because a library that has survived
13+ years of real use is a good place to watch these tradeoffs play out. Read the
OkHttp specifics as *illustration*, not as HTTP-only rules. The `SKILL.md`
principles (abstractions only with two implementations, compose-don't-inherit,
type your errors) are the base; this file adds the design moves that show up when
you build something many strangers depend on.

## Extensibility is an escape hatch — keep the core small

Every library starts life "lightweight" and ends up large, because you keep
extending it to meet the needs of every friend and customer, and then *every*
user pays for features almost none of them wanted. The way out is not more
features. It is a few well-placed **extension points** so users can plug in the
behavior they need without you growing the core.

- **A good extension point can become your own internal architecture.** OkHttp
  exposes user *interceptors* (wrap every call, mutate request/response, retry,
  short-circuit). Interceptors shipped first as a public API; later the library
  was re-implemented *as its own stack of interceptors* (roughly: user
  application interceptors, then built-in stages for retry/redirect, header
  bridging, cache, and connection, then user network interceptors, then the call
  to the server). Nobody designed the extension API to carry the whole library.
  That it *could* is the strongest evidence the extension point was the right
  shape. When your plug-in API is good enough to implement the product with, you
  have escaped the feature-bloat treadmill.
- **Prefer an escape hatch to a feature.** The gRPC ecosystem rides on OkHttp not
  because OkHttp added gRPC features, but because it exposed the right seams for
  the gRPC team to plug into. Adding a seam serves users you will never meet;
  adding a feature serves only the ones who asked.
- Interceptors, an event hook (below), and typed request metadata (tags, below)
  are three *different* extension shapes. You usually need more than one, because
  "wrap the call", "observe the call", and "attach data to the call" are
  genuinely different needs.

## A small, composable interface beats a fat class

The **size** of an interface is a claim about what implementations are possible.
A fat interface hands callers many capabilities but also forbids most
implementations, because every implementer must satisfy the whole surface.

- OkHttp's ecosystem replaced the fat `java.net.Socket` (a broad class with
  effectively two real implementations, plain TCP and its TLS wrapper) with a
  tiny Okio `Socket`: two streams and a way to cancel (`close()` from any thread
  makes its source and sink fail). That small surface admits *many* more
  implementations and, crucially, **layering**: wrap TLS over TCP, TLS over an
  HTTP-upgrade tunnel, a QUIC-style stream over something else. Composition
  becomes possible precisely because the interface is small enough that a wrapper
  can implement it over another instance of it.
- The same small surface unlocks an **in-memory implementation**
  (`inMemorySocketPair()`): two mutually connected sockets with no kernel
  involved. That single design choice pays off directly in testability (below).
- Design heuristic: when an interface has more than a couple of methods, ask
  which of them *constrain implementers* versus *serve callers*. Every method is
  both. A wide surface that only serves callers is a surface no one else can
  re-implement or wrap.

## Observability is a typed event hook, not logging

When someone asks for logging, they almost always want **observability** and have
named the wrong tool. Logging is the weakest form of it: invisible to
operational and business health, never carrying the context you actually want,
expensive, and a standing liability (whatever you log is either PII or
incomplete). Reach past it.

- Replace every place you would log with a call to a typed **event listener**:
  `dnsStart`, `connectStart`, `responseHeadersEnd`, and so on. It becomes *the
  caller's* decision whether an event turns into a log line, a metrics counter
  (Datadog / Prometheus), a business signal ("TLS handshake slowed, revenue
  dipped"), or nothing. One hook, many sinks, chosen at the edge — the same
  "decide the string/policy at the boundary" instinct as typed errors in the main
  skill.
- **Defining the events tightens the implementation.** Committing to "there is
  exactly one place a DNS lookup happens, and it emits one start/end pair" forces
  the code to actually have one such place. The observability contract disciplines
  the internals to live up to it.
- **Event hooks double as test assertions.** Because effects are observable, a
  test can assert "this call must not perform two DNS lookups" or "this response
  must come from cache" by watching the event stream, instead of reaching into
  internals. Observability you built for production becomes a precise,
  non-invasive test facet for free.

## Design for testability as a first-class driver: control time and I/O

The recurring move in this codebase is: make the hard thing *testable*, then use
that testability to take one more step you would not have dared to take by
reasoning alone. Testability is not a tax you pay after design; it *is* a design
driver, and the two levers are **time** and **I/O**.

- **Own your scheduling so tests can simulate the clock.** OkHttp's `TaskRunner`
  is a hand-rolled scheduler (it predates coroutines and cannot use them) built
  with a pluggable backend. Production uses real threads and the wall clock;
  tests swap in a backend with a *simulated* clock, so scheduling tests run
  single-threaded, deterministic, and faster than real time. This is exactly what
  `kotlinx.coroutines.test` gives you with `runTest` and virtual time; if you
  cannot use it, the pattern (inject the clock and the executor) still applies.
- **Inject the filesystem, including a faulty one.** The disk cache is tested
  against an in-memory `FakeFileSystem` wrapped by a *fault-injecting* filesystem:
  "the next delete of this file must throw", "this write hits a full disk". You
  cannot reliably provoke those conditions against a real disk, so you model the
  filesystem as a dependency and script its failures.
- **Push I/O in-memory to delete flakiness and kernel round-trips.** The
  in-memory socket pair lets HTTP-layer tests run without ever touching the
  operating system's socket API, so they are dramatically faster and cannot flake
  on real networking.
- **The payoff compounds.** OkHttp's riskiest rollout — *Happy Eyeballs* /
  "fast fallback", racing multiple connection attempts with a 250 ms head start
  and keeping whichever connects first (RFC 8305) — was only shippable because the
  testable scheduler let them simulate "Seoul is slow, Frankfurt wins" faster than
  real time. (Racing redundant work to cut tail latency is *request hedging*; the
  coroutine form lives in the `kotlin` skill's
  `references/streaming-server-patterns.md`.)

## Graceful degradation — "play hurt"

A subsystem that fails should degrade to *less useful*, never to *broken*, and its
failure must not contaminate an unrelated subsystem.

- OkHttp's cache is built to "play hurt": if the filesystem misbehaves, callers
  observe a lower (or zero) cache hit rate, **not** `IOException`s leaking out.
  The network keeps working. The catastrophe to avoid is contamination — a full
  disk silently breaking the network because a cache write failed is one failure
  wrecking an unrelated feature.
- Concrete advice from the same talk, worth heeding: for persistence, prefer a
  real database (SQLite, Postgres) over hand-rolled files. Filesystems are full of
  brutal, platform-specific edge cases (Windows refuses to delete a file that is
  open for read; a full disk can block the deletes that would free it). If you
  must use files, reach for atomic-write / transactional-filesystem helpers rather
  than raw `write`/`rename`.

## Make the "off" state free — match the structure to the real size

A feature that costs nothing when unused can be added without guilt, and most
optional features are unused on most calls. The way to get there is to size the
data structure to reality and make the empty state a shared constant.

- OkHttp lets you attach arbitrary typed metadata to a call (**tags**, keyed by
  `Class`). The obvious implementation is a `Map`. The expected element count is
  ~0, occasionally 1 or 2, so a `ConcurrentHashMap` (a sharded concurrent
  database) is wildly oversized. Instead tags are modeled like `CoroutineContext`:
  a single immutable **empty** singleton reused by every call, plus an immutable
  linked node per entry, updated by swapping an atomic reference. Adding the whole
  feature costs a call that does not use it *nothing*: it just points at the shared
  empty instance.
- General rule: pick the structure for the *actual* expected size and access
  pattern, not the worst case you can imagine, and make the disabled/empty path a
  shared immutable constant rather than a fresh allocation.

## Dynamic resource optimization is powerful — name its scary tail

Collapsing many logical tasks onto few real resources is a big win in steady
state and hard to reason about under stress. Ship it if you must, but state the
tradeoff out loud.

- `TaskRunner` collapses potentially thousands of scheduled jobs (per-connection
  websocket pings, etc.) onto about **two** threads by ping-ponging the
  "scheduler" and "executor" roles between threads, and it scales all the way to
  **zero** threads when idle. Wonderful — until the outside world changes. When one
  remote endpoint goes slow, the tasks that used to collapse onto shared threads
  can no longer share, and thread count balloons (his example: ~1000 threads
  becomes ~2000 to do the *same* work) exactly when the system is already under
  stress.
- The lesson is not "don't do this". It is that **resource usage becomes a
  function of conditions outside your program**, so the failure mode is emergent
  and correlated with bad times. If you build optimistic dynamic resource
  management, document the tail and cap it (bounds, backpressure, load shedding)
  rather than trusting the happy path.

## Kotlin expression (cross-linked)

Two of the moves above have a specifically Kotlin-idiomatic form. The language
mechanics live in the `kotlin` skill (`Result<D, E>`, coroutines,
`references/language-features.md`); the design intent is here.

- **Model a "nullable only in a corner case" value as non-null with a throwing
  stand-in.** OkHttp 5 made `Response.body` non-null. It had been nullable *only*
  to cover the rare bodyless responses (`cacheResponse` / `networkResponse` /
  `priorResponse`), which forced a `!!` (the presenter's "bang-bang of shame") on
  every ordinary call site. The fix: return a real, non-null body for those rare
  responses that *throws if you actually try to read it* (the talk calls it an
  "unreadable response body"). The common path reads cleanly; the impossible case
  fails loudly at the exact moment of misuse. Prefer this to a type that is
  nullable purely to encode a corner case and taxes every caller with a null check.
- **Immutable structural-sharing context.** The tags map above (empty singleton +
  per-entry immutable link, atomic-reference swap) is the `CoroutineContext`
  pattern applied to a near-empty typed map, and it is the idiomatic Kotlin way to
  get the "free when unused" property.

---

Distilled from Jesse Wilson's KotlinConf 2026 (Munich) talk "Deconstructing
OkHttp" (a walk through OkHttp/Okio internals). API and symbol names verified
against Okio/OkHttp docs and changelogs; specific figures (thread counts,
database sizes, byte budgets) and the internal-implementation anecdotes are as
the presenter described them, treated as of mid-2026. Where the public docs did
not confirm an exact class name (e.g. the unreadable-body type), the *pattern* is
stated rather than a citable symbol.
