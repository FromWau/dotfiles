---
name: android-kmp
description: Android and Kotlin Multiplatform framework development — MVI + Compose + ViewModel, Koin DI, ViewModel lifecycle/scoping, DataStore/Room/Moko permissions, Gradle/AGP toolchain. This is the framework tier; load it alongside `kotlin` (language idioms) and `software-design` (architecture). Apply for work touching `build.gradle.kts`, `AndroidManifest.xml`, Compose UI, ViewModels, or KMP source sets (`androidApp/`, `composeApp/`, `shared/`, `commonMain/`, `androidMain/`, `iosMain/`). For plain Kotlin with no Android/KMP framework in play, the `kotlin` skill alone is enough.
---

# Android / KMP

The **framework tier**. Two companions carry the layers beneath it — load them alongside this one when the work reaches down into them:
- **`kotlin`** — Kotlin-language idioms: the `Result<D, E>` type, coroutines/flows, ranked domain types, `inline`/`value class`, formatting.
- **`software-design`** — language-agnostic architecture: layering & dependency direction, use cases, model/mapper boundaries, when to abstract, composition over inheritance, typed-error philosophy.

Launch applications: first check for `.run/*.xml` configs — these are used by Android Studio to run a profile.

## When to read references

- **`references/compose-deep-dive.md`** — state retention (`remember`/`retain`/`rememberSaveable`), UI state modeling, focus/keyboard, performance, stateful vs stateless, pagination, UX best practices. Read when building Compose UIs.
- **`references/viewmodel-scoping.md`** — composable-scoped ViewModels (lifecycle 2.11 `rememberViewModelStoreOwner`/`LocalViewModelStoreOwner`), one VM per list item/card/sheet, state ownership across multiple VMs, keeping many scoped VMs + per-item flows cheap, KMP/CMP availability. Read when scoping a VM to anything smaller than a screen.
- **`references/persistence-and-platform.md`** — DataStore Preferences with KeyStore encryption, Room, KMP permissions via Moko. Read when persisting data or handling permissions. (Kotlin/JVM file I/O and `inline`/`value class` live in the `kotlin` skill.)

For coroutines/flows and the concurrent-service actor pattern, read the `kotlin` skill's references.

## Gradle & Toolchain

- Use `./gradlew build` for normal validation — validates all targets and test compilation
- Use `./gradlew clean build` only after major refactors or big feature changes — not needed for small fixes
- **JDK toolchain**: Use `jvmToolchain(N)` on the Kotlin extension in root `build.gradle.kts` for compilation. Use `org.gradle.toolchains.foojay-resolver-convention` in `settings.gradle.kts` for auto-provisioning.
- **Daemon JDK**: `jvmToolchain()` only affects compilation tasks. AGP's `JdkImageTransform` (and other artifact transforms) run inside the Gradle daemon and use the daemon's JDK, not the toolchain. To control the daemon JDK, run `./gradlew updateDaemonJvm --jvm-version=N` — this generates `gradle/gradle-daemon-jvm.properties` with Foojay download URLs for all platforms. Commit this file. Without it, the daemon uses the system JDK, which may be incompatible with AGP.

## Architecture — MVI

- Always use the **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state.
- The layering, dependency direction, and single-source-of-truth rules that MVI sits inside are in **`software-design`**; the `Result`/error types it returns are in **`kotlin`**.
- **Never inject services or repositories into composables** — composables receive only state and an `onAction: (Action) -> Unit` lambda. All side effects (navigation, API calls, DB writes, service calls) go through `onAction` → ViewModel. The ViewModel is the only place that holds dependencies and orchestrates work.
- Not every ViewModel needs state/action/events — don't force MVI structure on static screens or simple cases.

## MVI: State vs Actions vs Events

- **State** (`data class`): persistent values that affect UI appearance (`isLoading`, `todos`). Survives config changes — re-collected after rotation is expected. Bundle all UI-impacting fields in one state class
- **Actions** (`sealed interface`): user-triggered intents sent **UI → ViewModel** (`ToggleTodo(id)`, `OnSwipeToRefresh`). Pass a single `onAction: (Action) -> Unit` lambda to composables instead of many individual lambdas
- **Events** (`sealed interface`): one-time signals sent **ViewModel → UI** (`ShowSnackbar(message)`, `NavigateToHome`). Use `Channel(UNLIMITED)` + `receiveAsFlow()` — consumed exactly once, not re-fired after config changes
- **Never put one-time things in State** (snackbar messages, navigation triggers) — they re-fire on every config change because State is re-collected. Use Events instead
- Collect events via a lifecycle-aware `observeAsEvents` utility function, not `LaunchedEffect` on a state field

## Error → UI Text

Data/domain return **typed errors** (the philosophy is in `software-design`, the `Result<D, E>` form in `kotlin`). The presentation layer is where a typed error becomes a display string. Use the **`UiText` pattern** so the ViewModel doesn't need a `Context`:

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

## Dependency Injection

- Use Koin with `singleOf(::Impl) bind Interface::class`
- Constructor injection over field injection

## ViewModel Lifecycle

- Use `onCleared()` for cleanup (session logout, closing resources)
- Don't pass data through navigation routes — use a central `Session` singleton
- A VM no longer needs a backstack entry — with lifecycle 2.11 you can scope one to *any*
  composable (per list item/card/bottom sheet) via `rememberViewModelStoreOwner` + a
  `LocalViewModelStoreOwner` override. Reach for this only on complex screens with
  independently-stateful subcomponents, not plain lists. For the pattern, state-ownership
  rules, the "one hot source / cheap per-item slices" performance rule, and KMP/CMP
  availability, read `references/viewmodel-scoping.md`
