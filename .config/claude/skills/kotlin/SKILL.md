---
name: kotlin
description: Kotlin language conventions — idioms and formatting for `.kt`/`.kts`. Idioms: Kotlin-first libraries (`kotlinx.*`), the `Result<D, E>` sealed error type, ranked domain types via sealed interface, mappers as extension functions, `inline`/`value class`, coroutines & flows. Formatting: trailing commas, string templates, Compose/lambda/`when` layout — conventions ktlint/detekt defaults don't enforce. Load whenever writing, editing, or reviewing Kotlin. For the language-agnostic architecture principles behind these idioms load `software-design`; for Android/KMP framework specifics (MVI, Compose, ViewModel, Koin) load `android-kmp`.
---

# Kotlin

This skill is the **Kotlin-language** tier: idioms that apply to any Kotlin (`commonMain`, JVM, a Gradle plugin, a Godot/JVM game) plus formatting conventions. It sits between two companions:
- **`software-design`** — the language-agnostic *why* behind these idioms (layering, typed errors, composition over inheritance). Load it for architecture/structure decisions.
- **`android-kmp`** — the Android/KMP framework layer (MVI, Compose, ViewModel, Koin, Gradle). Load it for framework work.

## When to read references

- **`references/coroutines-and-flows.md`** — structured concurrency, dispatchers, suspend vs. flows, cold/hot flows, cancellation, anti-patterns. Read when writing coroutine code or debugging flow behavior.
- **`references/concurrent-service.md`** — an injectable, thread-safe service with an internal state machine, using the single-owner command-channel (actor) pattern: one coroutine owns the state, callers send it commands and get typed `Result` replies via the ask pattern. Read when building a service/manager/controller that holds lifecycle state and is called concurrently.
- **`references/streaming-server-patterns.md`** — compositional recipes for a server/producer that runs independent work concurrently and streams results: generator, fan-in (`channelFlow`), server- vs client-side ordering (with the cold-flow-in-`async` pitfall), timeouts, request hedging, and back-pressure/`buffer`. Read when building a streaming pipeline or fanning out RPCs into one output stream.
- **`references/language-features.md`** — `inline`/`reified`/`crossinline`, `@JvmInline value class`, and Kotlin/JVM file I/O (buffered reading). Read when reaching for these language/stdlib features.

## Kotlin-first Libraries

Prefer Kotlin-native libraries over their Java predecessors — they're `commonMain`-friendly and idiomatic:
- `kotlinx.serialization` over Gson/Moshi
- `kotlinx.coroutines.flow` over RxJava/LiveData
- `kotlin.time.Instant` / `kotlin.time.Clock` over `java.time`
- `kotlin.uuid.Uuid` over `java.util.UUID`
- `kotlinx.collections.immutable` for lists held in UI state

## Typed Errors — the `Result<D, E>` Idiom

The *philosophy* (type your errors, never leak strings out of data/domain, decide the display string at the edge) lives in `software-design`. This is the Kotlin form:

- Use a custom `Result<D, E : Error>` sealed type for expected failures — don't throw, don't return message strings.
- Root the error hierarchy in a domain `Error` sealed interface; data-layer enums implement it:
  ```kotlin
  // domain layer
  sealed interface Error
  sealed interface DataError : Error {
      enum class Network : DataError { RequestTimeout, NoInternet, PayloadTooLarge, ServerError, Unknown }
      enum class Local : DataError { DiskFull, Unknown }
  }
  enum class PasswordError : Error { TooShort, NoUppercase, NoDigit }
  ```
- The sealed root keeps `when` exhaustive: adding a failure is a compile error at every site that must handle it.
- **Respect cancellation in `catch` blocks**: call `currentCoroutineContext().ensureActive()` before returning an error, so a cancelled scope rethrows instead of being swallowed into a `Result.Error`.
- **Never catch `CancellationException`** — let it propagate. (Mapping a typed error to a user-facing string via `UiText`/`StringResource` is Android-specific — see `android-kmp`.)

## Ranked Domain Types — Don't Compare Enums with `<`/`>`

- `<`/`>` on an enum uses `ordinal` (declaration order). Reorder/insert an entry
  and every comparison silently changes meaning. You can't fix it on the enum:
  `Enum.equals`/`compareTo` are `final`, and extension operators are shadowed.
- Fix: a `sealed interface` with an abstract `rank`, `Comparable` from `rank`:
  ```kotlin
  sealed interface Role : Comparable<Role> {
      val rank: Int
      override fun compareTo(other: Role): Int = rank.compareTo(other.rank)

      data object Visitor : Role { override val rank = 0 }
      data object Worker : Role { override val rank = 1 }
      data object Admin : Role { override val rank = 2 }
  }
  ```
  `<`/`>` are now rank-correct, `when` stays exhaustive (adding a role = compile
  error everywhere), `==` works. No `isGreaterThan`/infix helpers needed.
- Prefer `interface` over `sealed class Role(val rank: Int)` here: the class form
  works (its ctor is `protected`, not public) but still exposes a constructor in
  the API, reading as "construct a Role with any rank" — wrong model for a closed
  set. The interface's only cost is each entry needs a `{ override val rank = N }`
  body instead of a one-liner; write it multiline so the IDE doesn't reformat it.
- Not `@JvmInline value class` — not a closed set, reintroduces the fragility.
- Before converting, grep for `valueOf`/`entries`/`.name`/`.ordinal` — safe to
  convert if the type is only created, compared, and mapped to a display string.

## Mappers as Extension Functions

- Write mappers as **extension functions in a separate `mappers` file/package** — never inside the model class (no `toX()` on a companion object). Extensions keep the model a plain data holder and let each layer own its own mappers. (*Which* layer a mapper lives in follows the dependency arrow — see `software-design`.)

## Formatting & Linting

Conventions ktlint/detekt defaults don't enforce.

### General Rules
- **Trailing commas** — always add trailing commas on the last parameter, enum entry, and collection element
- **Line length** — break lines at ~120 characters
- **Blank lines** — one blank line between functions, between logical sections within a function
- **Never use semicolons** — never put multiple statements on one line with `;`. Each statement gets its own line

### String Formatting
- **Always prefer string templates** (`$x`, `${expr}`) over `%s`/`%d` format placeholders, in *every* context — including `Timber`, `String.format`, exception messages, etc.
- Applies to single- and multi-line strings:
```kotlin
// WRONG
Timber.d("onCreate: taskId=%d, savedInstance=%s", taskId, savedInstanceState != null)
Timber.w(e, "failed to clear session/KV after %s", reason)

// RIGHT
Timber.d("onCreate: taskId=$taskId, savedInstance=${savedInstanceState != null}")
Timber.w(e, "failed to clear session/KV after $reason")
```
- Tradeoff acknowledged: Timber's varargs form defers formatting until the log is actually written; string templates evaluate eagerly. The codebase prefers readability and templates anyway — do not "optimize" by switching back to `%s`/`%d`.

### Function Parameters
- **1 param** — can stay on one line if short: `fun foo(bar: String): Int`
- **2+ params** — each on its own line:
```kotlin
fun createEntity(
    name: String,
    path: Path,
    cover: Path? = null,
): ArtistEntity
```

### Compose Composables
- **Each parameter on its own line** when there are 2+ params:
```kotlin
Text(
    text = candidate.title.value,
    style = MaterialTheme.typography.titleSmall,
    modifier = Modifier.weight(1f),
    maxLines = 1,
    overflow = TextOverflow.Ellipsis,
)
```

- **Never inline composable content** — always break Row/Column content across lines:
```kotlin
// WRONG
Row(verticalAlignment = Alignment.CenterVertically) { Text("Label"); Spacer(Modifier.width(6.dp)); Text(value) }

// RIGHT
Row(
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(6.dp),
) {
    Text(
        text = "Label",
        style = MaterialTheme.typography.labelSmall,
    )

    Text(
        text = value,
        style = MaterialTheme.typography.bodySmall,
    )
}
```

- **Use `Arrangement.spacedBy()`** instead of manual `Spacer` between sibling elements in Row/Column
- **Blank lines between logical blocks** inside Column/Row content (e.g., between a title row and a meta row)

### Data Classes & Enums
```kotlin
// Trailing comma on last field
data class MediaEntity(
    val id: Uuid,
    val name: String,
    val path: String,
)

// Trailing comma on last entry
enum class MediaType {
    AUDIO,
    VIDEO,
}
```

### When Expressions
- Short branches can stay on one line
- Long branches get their own block:
```kotlin
val view = when (action) {
    Action.OnOverviewClicked -> Tab.Overview
    Action.OnNewClicked -> Tab.New
    Action.OnMissingClicked -> Tab.Missing
}
```

### Lambda Formatting
- **Short lambdas** — one line: `items.map { it.toDomain() }`
- **Multi-statement lambdas** — braces on their own lines:
```kotlin
_state.update { old ->
    old.copy(
        candidates = old.candidates.map { c ->
            if (c.path == path) transform(c) else c
        }.toImmutableList(),
    )
}
```

### No Unicode Escapes in Code
- **Never use unicode escape sequences** (`→`, `▶`, `—`, etc.) in string literals
- Use plain text for labels: `"Artist"` not `"→ Artist"`
- If you need icons/symbols in UI, use actual Compose `Icon()` components, not unicode characters in strings
- Separators should be plain characters: `" - "` not `"—"`

### Chained Calls
- Break after each `.` when the chain is long:
```kotlin
triageRepository
    .getCandidatesByReason(CandidateReason.NEW)
    .collect { result ->
        result.onSuccess { candidates ->
            // ...
        }
    }
```
