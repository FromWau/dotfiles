# Persistence, Platform & Language Features

## File I/O — Basics

- `java.io.File` is just a **reference/pointer** to a path — no I/O happens on construction. The file/folder may not even exist
- On Unix, folders are also files — `File` can reference both. Check `isDirectory()` to distinguish
- `file.mkdirs()` creates **all missing parent directories** before creating a file (use over `mkdir()` for nested paths)
- Relative paths: `.` = current working directory, `..` = parent directory, `/prefix` = absolute root
- Recursive file traversal: check `child.isDirectory` to recurse into subdirectories

## File I/O — Buffered Reading and Writing

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

## DataStore Preferences (Android)

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

## Room Database

- Use `@Transaction` on queries returning `@Relation` types
- Prefer join tables over embedded lists for many-to-many relationships
- Composite primary keys via `primaryKeys = [...]` in `@Entity`
- `OnConflictStrategy.REPLACE` for upsert operations
- Delete dependents before parents (foreign key order)

## KMP Permission Handling (Moko Permissions)

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

## `inline` Functions

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

## `@JvmInline value class`

Single-field wrapper over a primitive. Compiled to the raw primitive — zero allocation overhead, but gives type safety and the ability to add validation/behavior:

```kotlin
@JvmInline
value class Month(val number: Int) {
    init { require(number in 1..12) }
}
```
