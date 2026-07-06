# Kotlin/JVM Language Features

`inline`/`value class` are pure Kotlin. The file-I/O notes are Kotlin/JVM (`java.io`) — they apply on JVM targets, not `commonMain`.

## `inline` Functions

- `inline` copies the function body to every call site — eliminates the call overhead. Most useful for functions that accept lambdas called in tight loops (`forEach`, `map`).
- Standard-library functions like `forEach`, `map`, `filter` are **already** `inline` — no need to rewrap them.
- **Extra capabilities unlocked by `inline`**:
  - **Suspending lambdas**: an inline function's lambda inherits the coroutine context of the call site — you can call `delay()` inside a non-suspend inline lambda.
  - **Non-local returns**: `return` inside an inline lambda returns from the *outer* function, not just the lambda.
  - **`reified` generics**: type parameters keep their type info at runtime (normally erased). Required for generic deserialization, `is T` checks, etc.
    ```kotlin
    inline fun <reified T> fromJson(json: String): T = Json.decodeFromString(json)
    ```
- **`crossinline`**: for a lambda executed asynchronously (inside a launched coroutine/thread). Disallows non-local returns, since the outer function may already have returned.
- **`noinline`**: for specific lambda params you *don't* want inlined (large bodies that would bloat bytecode).
- **When to use**: functions with lambda parameters called frequently. **Don't** add it to large bodies — bytecode grows at every call site.

## `@JvmInline value class`

Single-field wrapper over a primitive. Compiled to the raw primitive — zero allocation overhead, but gives type safety and a place to add validation/behavior:

```kotlin
@JvmInline
value class Month(val number: Int) {
    init { require(number in 1..12) }
}
```

## File I/O — Basics (JVM)

- `java.io.File` is just a **reference/pointer** to a path — no I/O happens on construction. The file/folder may not even exist.
- On Unix, folders are also files — `File` can reference both. Use `isDirectory()` to distinguish.
- `file.mkdirs()` creates **all missing parent directories** (use over `mkdir()` for nested paths).
- Relative paths: `.` = current working directory, `..` = parent, `/prefix` = absolute root.
- Recursive traversal: check `child.isDirectory` to recurse into subdirectories.

## File I/O — Buffered Reading and Writing (JVM)

- Raw byte-by-byte reading is slow — each `read()` is a low-level OS syscall. An 80MB file byte-by-byte = ~80 million syscalls (~37s).
- **Use `BufferedReader` / `BufferedWriter`** — reads large chunks into memory, then processes from memory. Same 80MB file: ~0.75s (50x+ faster).
  ```kotlin
  FileInputStream(file).bufferedReader().use { reader ->
      // processes from an in-memory buffer — not an OS call per byte
  }
  ```
- High-level extensions like `file.readBytes()` / `file.readText()` already buffer internally — no need to wrap them.
- **Use low-level buffered APIs when** you must process a file **gradually, line by line**, without loading it all into memory (large logs, data streams). Only one line is in memory at a time; the previous is GC-able each iteration.
- **Use `readBytes()` / `readText()`** only when you genuinely need the whole file at once (e.g. loading an image for processing).
