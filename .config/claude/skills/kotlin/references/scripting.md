# Kotlin Scripting (`.kts` / `.main.kts`) with Inline Dependencies

Kotlin runs `.kts` files directly — no Gradle, no `main()`, top-level statements
execute in order. This is the Kotlin answer to a Python script or a bash one-off.
The one thing people trip on is dependencies: they only work with the right
**file extension**, because the extension selects which *scripting host* runs the
file.

## Two hosts, chosen by extension

| File | Host | Dependency resolver? |
|------|------|----------------------|
| `foo.kts` | basic scripting host | **No** |
| `foo.main.kts` | `main-kts` host | **Yes** (Ivy/Maven, Central by default) |

The `.main.kts` suffix is what unlocks `@file:DependsOn`. This is not a stylistic
choice — the resolver lives only in the `main-kts` host, and the host is picked
purely from the filename. A plain `.kts` has no idea what `DependsOn` is:

```
foo.kts:2:7: error: unresolved reference 'DependsOn'.
```

So the annotation in a `.kts` is a **hard compile error, not a silent no-op** —
the fix is always "rename to `.main.kts`," never "the import is just being
ignored."

## Declaring dependencies

Put file-level annotations at the very top, before any `import`:

```kotlin
#!/usr/bin/env kotlin
@file:DependsOn("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
@file:DependsOn("com.squareup.okhttp3:okhttp:4.12.0")   // one per dependency
@file:Repository("https://jitpack.io")                  // only for non-Central repos

import kotlinx.coroutines.delay
// ... script body
```

- **`@file:DependsOn("group:artifact:version")`** — one per line; transitive
  dependencies come along automatically. The argument can also be a **local jar
  path** instead of Maven coordinates.
- **`@file:Repository(url)`** — only needed for repos other than Maven Central
  (JitPack, a private Nexus, a `file://` path). Central is the default, so most
  scripts omit it.
- **`@file:Import("other.main.kts")`** — pull in another script file.
- **`@file:CompilerOptions("-jvm-target", "17")`** — pass compiler flags.

Coordinates must be **exact versions** — there is no lockfile and no range
resolution. Pin `1.10.2`, not `1.10.+`. (This is the main thing `.main.kts`
gives up versus `uv`/PEP 723, which resolves a full graph and writes a lock.)

## Running from a shell via shebang

```bash
chmod +x foo.main.kts     # once
./foo.main.kts            # kernel runs `kotlin foo.main.kts` via the shebang
```

The shebang line is `#!/usr/bin/env kotlin`. Note the host is still selected by
the `.main.kts` **filename suffix**, not by anything in the shebang — you cannot
coax dependency resolution out of a file named `foo.kts` by changing the
interpreter line. Equivalent non-shebang invocations: `kotlin foo.main.kts` or
`kotlinc -script foo.main.kts`.

## Structure: always define a `main()`

A script has no entry point of its own — the host runs the top-level statements
in order and never looks for a `main` function. So a `suspend fun main(args)` on
its own is *dead code*; nothing calls it.

**Define one anyway** and drive it from a single line at the bottom. Even though
the script runs without it, a clear `main()` is the convention to enforce here:

```kotlin
suspend fun main(args: Array<String>) { /* ... */ }

runBlocking { main(args) }   // the host won't call main; we do
```

Why enforce it:
- It reads as an obvious entry point — a reader knows where execution begins
  instead of scanning loose top-level statements.
- It keeps the top level to one line, so all logic lives in named functions.
- It travels: drop the same code into a *compiled* program and `main` becomes the
  real entry point (there the compiler wraps `suspend fun main` for you, so you
  delete the `runBlocking { main(args) }` line).

The bottom line does two jobs, only one of which is optional:
- **`main(args)`** — required *because the host won't call it*. `args` is the
  script's implicit argument array, forwarded in.
- **`runBlocking`** — required whenever `main` (or anything it calls) suspends.
  The top level is not a suspend context, so a suspend call there is a compile
  error (`suspend function ... can only be called from a coroutine or another
  suspend function`). `runBlocking` bridges into the coroutine world and blocks
  until it finishes — exactly right at a script's top level.

### Full example — deps + args + flow + timing + `main`

Ties the reference together: an inline dependency, CLI arg parsing, a `Flow`,
timing with `kotlin.time.Clock`, and a `main` entry point.

```kotlin
#!/usr/bin/env kotlin
@file:DependsOn("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")

import kotlin.time.Clock
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.runBlocking

fun workLines(count: Int): Flow<String> = flow {
    repeat(count) { i ->
        (1..100_000).onEach { it % 2 == 0 }   // one line of work
        emit("line ${i + 1} done")
    }
}

suspend fun main(args: Array<String>) {
    val lines = args.getOrNull(0)?.toIntOrNull() ?: 1
    val start = Clock.System.now()
    workLines(lines).collect { println(it) }
    println("Duration: ${Clock.System.now() - start}")
}

runBlocking { main(args) }
```

Run: `./script.main.kts 5`.

**Parsing the first arg.** Use `getOrNull(0)?.toIntOrNull()` so a missing *or*
non-numeric arg is handled uniformly, then pick a policy:
- Lenient default: `?: 1` — falls back silently.
- Strict: `requireNotNull(args.getOrNull(0)?.toIntOrNull()) { "first arg must be an int" }`
  — fails loudly with your message.

Note `require(args[0].toInt()) { "..." }` does **not** work: `require` takes a
`Boolean`, but `toInt()` returns an `Int` (and throws its own
`NumberFormatException` before your message ever runs). `requireNotNull(...
toIntOrNull())` is the idiom that both validates and returns the value.

## Resolution and caching

The **first** run of a script (or any run after you edit it) resolves and
downloads dependencies and compiles the script — expect a few seconds of pause,
and log lines from the Aether/Ivy resolver. Artifacts land in your local Maven
cache and the compiled script is cached too, so an unchanged script runs fast on
the next invocation. If you see resolver chatter on stderr you don't want in
output, filter it: `./foo.main.kts 2>/dev/null`, or grep out `INFO`/`Picked up`.

## Gotcha: you can't `delay` inside `sequence { }`

A tempting "emit a value every N ms" script looks like this — and does **not**
compile:

```kotlin
sequence<String> {
    repeat(100) {
        delay(500)          // error: unresolved reference / restricted suspension
        yield("tick")
    }
}
```

Two independent reasons, worth understanding because the error message only shows
the first:

1. `delay` is `kotlinx.coroutines.delay` — absent unless you add the coroutines
   dependency (so in a plain `.kts` it's `unresolved reference 'delay'`).
2. Even *with* the dependency it still won't compile: the block's receiver is
   `SequenceScope`, annotated `@RestrictsSuspension`. That restriction allows
   only the scope's *own* suspend members (`yield`/`yieldAll`). A `sequence` is a
   **synchronous generator** — it has no business awaiting time, so an
   unrestricted library suspend like `delay` is rejected by design.

Pick the fix by what you actually mean:

- **Just pace a loop, no coroutines** — `Thread.sleep(500)` works fine inside
  `sequence { }`. It's an ordinary *blocking* call, not a `suspend` function, so
  `@RestrictsSuspension` never applies and no dependency is needed. The sequence
  stays lazy: each pull sleeps then yields.
- **You actually want async emission** — use a `Flow`, which *is* a real suspend
  context, and add the coroutines dependency:

  ```kotlin
  #!/usr/bin/env kotlin
  @file:DependsOn("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")

  import kotlinx.coroutines.delay
  import kotlinx.coroutines.flow.flow
  import kotlinx.coroutines.runBlocking

  fun ticks() = flow {
      repeat(100) {
          delay(500)
          emit("tick")
      }
  }

  runBlocking { ticks().collect { println(it) } }
  ```

  `runBlocking` blocks the calling thread, which is exactly right at a script's
  top level (there's nothing else for that thread to do). Only reconsider it if
  you paste the logic into app code, where you'd collect from an existing scope.

## Pitfalls checklist

- `@file:DependsOn` in a `.kts` → `unresolved reference 'DependsOn'`. Rename to
  `.main.kts`.
- Version ranges don't resolve — pin exact `group:artifact:version`.
- First run is slow (resolve + compile); that's cached, not a bug. Later runs are
  fast until you edit the file.
- `delay` in `sequence { }` never compiles — use `Thread.sleep` (blocking) or a
  `Flow` (async).
- `main` is never auto-invoked in a script. Always define a `suspend fun main` for
  a clear entry point, but drive it explicitly with `runBlocking { main(args) }` —
  the top level isn't a suspend context, so you can't call it directly.
- `require(arg.toInt())` doesn't compile (`require` wants a `Boolean`). Use
  `requireNotNull(arg.toIntOrNull()) { "..." }` to validate and return the value.
