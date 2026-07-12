# Testing Kotlin / KMP: strategy + TestBalloon

Framework-agnostic testing principles for Kotlin (especially multiplatform),
then **TestBalloon** as the concrete framework and the a-sit-plus addons for
data-driven testing at scale. The principles survive whatever framework you
pick; the TestBalloon sections are how to express them today.

Contents:
1. KMP testing principles (durable, framework-agnostic)
2. TestBalloon: the framework (setup, the 3-function API, config, integration)
3. Data-driven at scale: the a-sit-plus addons
4. Choosing and migrating between frameworks
5. Pitfalls

## 1. KMP testing principles

These hold regardless of framework. They come from teams running Kotlin
Multiplatform in production, and most of the pain they address is invisible on a
JVM-only project.

- **Run on every target you ship, not just the JVM.** Android is not the JVM and
  the JVM is not Android: as code nears the OS or hardware, behavior diverges.
  Host-based unit tests and Robolectric are a convenience, not a substitute. If
  you ship an Android artifact, test it on the emulator and on real devices, and
  ship a dedicated Android target (Android SDK + Kotlin Android plugin), not a
  JVM artifact.
- **Execute tests concurrently on purpose.** Parallel execution is not only about
  speed; it flushes out **hidden global mutable state**, brittle initialization
  order, and heisenbugs that a sequential run hides. This state differs per
  target, so concurrency surfaces target-specific bugs you cannot reason about
  otherwise. Assume the shared mutable state is there until concurrency proves
  otherwise.
- **Prefer distinct tests over a loop inside one test.** Looping assertions inside
  a single test destroys **visibility**: a green result cannot tell you whether it
  checked three cases, one, or none, and a failure does not say which input broke.
  Registering one test element per case keeps the report honest. This is the
  single strongest reason to want a framework where parameterization produces
  separate, visible test nodes.
- **Property / data-driven testing for breadth.** Generate many inputs rather than
  hand-writing each. Keep hand-written tests for the happy path and known edge
  cases, and throw generated data at everything else. When a spec is large (think
  hundreds of pages of encoding rules), generators are the only tractable way to
  get coverage.
- **Test against known-good reference implementations** where they exist. You
  often only have a reference on one target; if you know what you are doing you
  can extrapolate the verified behavior to the other targets.
- **Fresh fixture per test.** State a test depends on should be initialized fresh
  for that test. Sharing state across tests silently couples them and makes
  failures order-dependent. Reserve shared state for deliberate stepwise flows.
- **Deep vs shallow parallelism is a real cycle-time lever.** A framework that
  parallelizes only the top level(s) of the hierarchy leaves most leaf tests
  running sequentially; one that parallelizes the whole tree scales with cores.
  On deep test trees this is the difference between a ~10 percent and a ~70
  percent wall-clock reduction (see the TestBalloon vs Kotest note below).

## 2. TestBalloon: the framework

**TestBalloon** (`github.com/infix-de/testBalloon`, docs
`infix-de.github.io/testBalloon`, 1.0 reached mid-2026 after ~50 pre-releases)
is a Kotlin-first test framework built for today's ecosystem: **coroutines-first**
(coroutines available everywhere with no ceremony, coroutine-context inheritance
down the tree), **multiplatform-first** (JVM, JS, Wasm, Native incl. iOS/macOS,
Android host- and device-side tests, Robolectric, all in first-party quality),
and a **scope-friendly, extensible DSL** instead of annotations. Its author
maintained Kotest for years; TestBalloon is the "what would we build knowing what
we now know" answer.

The headline: the **entire API is three functions** (`testSuite`, `testFixture`,
`TestConfig`). Everything else is plain Kotlin. That is what keeps tests concise
and, in the AI age, cheap to review and to keep in context.

### When to reach for it

**Strong fit, pick it when:**
- The project is **multiplatform**, especially `commonMain`, Native, JS, or Wasm,
  or Android where you want both host- and device-side tests in first-party
  quality. This is the decisive win: JUnit is JVM-only.
- The suite is **large or deeply nested** and cycle time hurts. Whole-tree
  parallelism is where TestBalloon pulls far ahead of shallow parallelizers.
- The suite is heavily **data-driven / property-based** (pair it with the
  a-sit-plus addons for Kotest-style generators plus compact reporting).
- You value **concise, reviewable tests** and coroutine-first ergonomics (each
  test is already a coroutine, so no `runTest {}` wrapper or `lateinit` fixtures).

**Weak fit, stay put when:**
- The project is **JVM-only**, the team is JUnit-fluent, and the existing suite
  works. JUnit 5 plus `kotlinx-coroutines-test` is genuinely fine here, and its
  ecosystem is far larger and more mature.
- You are **risk-averse** about a young 1.0.x framework (small community, DSL may
  churn across minor versions) for critical test infrastructure.

**Either way:** adoption is incremental. TestBalloon coexists with JUnit 4/5/6 in
the same module, and you get the coroutines-test virtual-time behavior regardless
of framework, so trying it in one module is low-cost and reversible.

### Setup

Apply the Gradle plugin and depend on the framework; it runs your tests through
the standard Gradle test tasks and coexists with JUnit 4/5/6 in the same module,
so you can migrate gradually. Pin the version and confirm current coordinates
against the docs (it is young: 1.0.x).

### Suites and tests

A suite is a **top-level property** (the language needs an anchor point), tests
and nested suites live inside it, and the rest is ordinary Kotlin:

```kotlin
val WeatherServiceTest by testSuite {
    test("returns the current temperature") {
        assertEquals(21, service.temperature("Vienna"))
    }

    testSuite("seasonal") {
        test("drops after a thunderstorm") {
            // nested suite, plain Kotlin inside
        }
    }
}
```

### Fixtures

`testFixture { }` builds the state holder; `closeWith { }` tears it down. Access
the value by **invoking** the fixture. Because it is coroutines-first, the
fixture builder can call suspend functions directly (no `lateinit` + `runTest`
dance that JUnit forces).

```kotlin
val connection = testFixture { openConnection("jdbc:test:db") } closeWith {
    rollback()
    close()
}
val service = testFixture { WeatherService(connection()) }  // invoke to read

test("...") { service().temperature("Vienna") }
```

To make the fixture the **receiver** (`this`) inside tests, choose the isolation
level explicitly:

- `asContextForEach` provides a **fresh** value as the receiver for **each** test
  (the default you usually want: isolation).
- `asContextForAll` provides **one shared** value as the receiver for **all**
  tests in scope. This is exactly how you do **stepwise testing**: connect once
  under `asContextForAll`, then have later tests build on that shared state. The
  only change from per-test isolation to shared state is `ForEach` to `ForAll`.

### Parameterization is just Kotlin

There is no parameterized-test annotation API to learn. Put the `test(...)` call
in a loop. Multiple dimensions is nested loops. Each iteration registers a
**distinct, visible** test node, so you keep the visibility that a loop-inside-a-
test throws away, and there is no stringly-typed `@MethodSource` data flow to
review.

```kotlin
for (city in cities) {
    for (season in Season.entries) {
        test("$city in $season") { /* ... */ }
    }
}
```

### Configuration: TestConfig

Cross-cutting behavior is a **decorator chain**, conceptually the same model as a
Compose `Modifier`: start from a neutral `TestConfig` and enrich it. Every
element (test, suite, and the module-level `testSession` that parents everything)
takes a `testConfig` parameter, so you configure one test, a whole suite, or the
entire module with the **same one mechanism** and the same one class. (Kotest, by
contrast, spreads configuration across four levels and dozens of classes.)

Verified building blocks:

- `singleThreaded()`, `mainDispatcher()` (stable), inserting a **coroutine-context
  element** for a test or subtree, and running a subtree **concurrently** instead
  of sequentially.
- Wrapping hooks `aroundEach` / `aroundEachTest` (per leaf) and `aroundAll` (per
  block), which are the scope-friendly way to add setup/teardown, a real-time
  `withTimeout(...)` cap, a dispatcher, a timing report, or a conditional disable
  (for example, disable unless on CI). Because the hook hands you the inner
  `action`, you can wrap it in anything, including a `repeat` loop that retries a
  **flaky** test and only fails if every attempt fails.

You extend `TestConfig` with your own functions the same way you extend any
Kotlin DSL, so custom cross-cutting config composes cleanly instead of fighting a
fixed annotation set. (`testCompartment` exists for isolating groups; ignore it
until you need it.)

### Custom DSLs

Because tests are plain functions, you build custom test DSLs by copying the
standard `test` signature and adapting it. A "run this test N times" helper is a
few lines: copy the signature, add an `iterations` param, wrap the original call
in a loop. This scales all the way up to a full BDD/cucumber-style surface built
only on the public API, and such custom DSLs still get IntelliJ run gutters.

### Integration

- All Kotlin platforms in first-party quality, including **Robolectric** (its
  JUnit 5 integration, extracted) and Android device tests.
- Standard **Gradle test tasks and reports**, plus **Gradle test selection that
  works on the hierarchy**, not just class/method, which no other framework
  supports via Gradle filtering. Also runs under the Kotlin tool chain (Amper).
- **IntelliJ** run gutters, hierarchical test tree, results window.
- **Coexists with JUnit 4/5/6** in the same module for gradual migration.

## 3. Data-driven at scale: the a-sit-plus addons

For heavy data-driven / property testing, `a-sit-plus/testballoon-addons` bridges
Kotest's generator ecosystem onto TestBalloon. It is the package A-SIT Plus wrote
while migrating **Signum** (their KMP cryptography library, 600+ pages of specs,
millions of generated data points) from Kotest.

- Primary module: `at.asitplus.testballoon:matrix` (needs TestBalloon 1.0.0+,
  Kotlin 2.3.0+). Legacy per-concern helpers also exist: `datatest`, `property`,
  `fixturegen`, `freespec`, `fixturegen-freespec`.
- The matrix DSL composes **layers**: configure a layer, then either open it with
  `- { ... }` to nest, or finish with `test { ... }` to produce leaf test rows.

```kotlin
data("numbers", listOf(1, 2, 3), nameFn = { index, value -> "$index: n=$value" })
    .test { number -> number shouldBeGreaterThan 0 }

property("bytes", Arb.byteArray(Arb.int(1, 64), Arb.byte())) { seed = 0xC0FFEE }
    .test { bytes -> bytes.toHexString().hexToByteArray() shouldBe bytes }
```

- **Compact reporting** is the key to scale: naively registering a real node per
  generated case explodes the report and can exhaust CI. `compact` collapses
  virtual subtrees into single real elements while preserving failure detail
  (`CompactReport.FailuresOnly` / `AllCases` / `SummaryOnly`, `reportRows` to
  bound rendered detail). Each failure carries an **error-replay** block whose
  lines are valid arguments: paste them back onto the failing layer to re-run
  exactly those cases.
- Concurrency is per layer: `ExecutionMode.Sequential` or
  `ExecutionMode.Concurrent(parallelism)`. Matrix disables TestBalloon's
  virtual-time `TestScope` when a layer runs concurrently, to avoid deadlocks.

The talk's benchmark on a real Signum suite: sequentially the two frameworks are
comparable, but on a deep tree of ~1.7M tests, concurrency gained ~11 percent
under Kotest versus ~74 percent under TestBalloon. The stated reason is deep vs
shallow parallelism: TestBalloon parallelizes the whole tree, while Kotest is
described as parallelizing only its top couple of levels and running everything
below sequentially. Treat the exact figures as the presenters' numbers, but the
mechanism (deep parallelism) is the durable takeaway.

## 4. Choosing and migrating

- **`kotlin.test`**: lowest common denominator, no DSL, feels Java-ish. Fine for
  trivial multiplatform assertions.
- **JUnit 4/5/6**: JVM-only, annotation-based, verbose; JUnit 4 is still the
  Android default. Capable but the API grows complex as you use more of it, and
  parameterization loses type safety and readability.
- **Kotest**: mature, DSL-based, multiplatform, excellent assertions and property
  testing. Still the incumbent for data-driven KMP. Weak spots the migration story
  cites: no proper Android support, fixtures reliable only at the top level (lower
  levels deprecated), heavy configuration surface, shallow parallelism, and it can
  gate you from Kotlin early-access previews.
- **TestBalloon**: pick it for coroutines-first, multiplatform-first work where
  concise reviewable tests, deep parallelism, and first-party Android/Robolectric
  matter. Its Kotest-quality assertions story: **Kotest's assertion library works
  with TestBalloon**, so you keep the matchers you like.

Migration from Kotest is incremental: TestBalloon runs alongside JUnit-based
frameworks, so move module by module at your own pace. Keeping Kotest-style
data-driven syntax is what the a-sit-plus addons are for; once A-SIT had their
addons package ready, migrating the Signum suite reportedly took about an
afternoon and immediately surfaced hidden bugs (global mutable state, brittle
init order, heisenbugs) via full-tree concurrent execution.

## 5. Pitfalls

- **Do not loop assertions inside one test** to fake parameterization. You lose
  the count and the which-one-failed signal. Register distinct test nodes.
- **Bound anything that can run unboundedly.** A conversation/iteration wrapper or
  a retry loop needs a max and/or a `withTimeout`, or it burns time and CI
  resources.
- **Unbounded data-driven trees explode reports.** Use the addons' `compact`
  reporting once generated counts get large; a per-case real node at millions of
  cases fails CI on resource exhaustion.
- **Concurrency changes semantics, not just speed.** Turning on concurrent
  execution can surface real global-mutable-state bugs; that is the point, but
  expect to fix them rather than to see instant green.
- **Pin the TestBalloon version.** It is 1.0.x and young; pin it and confirm DSL
  specifics against `infix-de.github.io/testBalloon` when you upgrade.
- **Robolectric / host tests are not device tests.** Keep real emulator and device
  runs for anything near the OS or hardware.

---

Distilled from the TestBalloon conference talk (Oliver of infix.de, with A-SIT
Plus presenting the Signum migration). Framework, API, and coordinates verified
against the TestBalloon docs and the a-sit-plus/testballoon-addons repo; treat the
benchmark figures and version numbers as of mid-2026.
