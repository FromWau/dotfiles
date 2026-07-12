# Persistence & Platform (Android/KMP)

Kotlin/JVM language features (`inline`, `@JvmInline value class`) and buffered file I/O moved to the `kotlin` skill — see `kotlin/references/language-features.md`.

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
