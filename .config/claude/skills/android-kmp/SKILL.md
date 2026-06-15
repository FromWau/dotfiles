---
name: android-kmp
description: Android and Kotlin Multiplatform development — MVI, Compose, coroutines/flows, DI, error handling. Apply for any work touching Kotlin (`.kt`/`.kts`), `build.gradle.kts`, `AndroidManifest.xml`, or directories like `androidApp/`/`composeApp/`/`shared/`/`commonMain/`/`androidMain/`/`iosMain/`.
---

# Android / KMP

Launch applications: first check for `.run/*.xml` configs — these are used by Android Studio to run a profile.

## When to read references

This SKILL.md covers architecture and error-handling fundamentals. For domain-specific deep-dives, read the relevant reference file:

- **`references/coroutines-and-flows.md`** — structured concurrency, dispatchers, suspend vs flows, cold/hot flows, anti-patterns. Read when writing coroutine code, dealing with cancellation, or debugging flow behavior.
- **`references/compose-deep-dive.md`** — state retention (`remember`/`retain`/`rememberSaveable`), UI state modeling, focus/keyboard, performance, stateful vs stateless, pagination, UX best practices. Read when building Compose UIs.
- **`references/persistence-and-platform.md`** — File I/O (buffered reading), DataStore Preferences with KeyStore encryption, Room, KMP permissions via Moko, `inline` functions and `@JvmInline value class`. Read when persisting data or handling permissions.
- **`references/viewmodel-scoping.md`** — composable-scoped ViewModels (lifecycle 2.11 `rememberViewModelStoreOwner`/`LocalViewModelStoreOwner`), one VM per list item/card/sheet, state ownership across multiple VMs, keeping many scoped VMs + per-item flows cheap, KMP/CMP availability. Read when scoping a VM to anything smaller than a screen.

## Gradle & Toolchain

- Use `./gradlew build` for normal validation — validates all targets and test compilation
- Use `./gradlew clean build` only after major refactors or big feature changes — not needed for small fixes
- **JDK toolchain**: Use `jvmToolchain(N)` on the Kotlin extension in root `build.gradle.kts` for compilation. Use `org.gradle.toolchains.foojay-resolver-convention` in `settings.gradle.kts` for auto-provisioning.
- **Daemon JDK**: `jvmToolchain()` only affects compilation tasks. AGP's `JdkImageTransform` (and other artifact transforms) run inside the Gradle daemon and use the daemon's JDK, not the toolchain. To control the daemon JDK, run `./gradlew updateDaemonJvm --jvm-version=N` — this generates `gradle/gradle-daemon-jvm.properties` with Foojay download URLs for all platforms. Commit this file. Without it, the daemon uses the system JDK, which may be incompatible with AGP.

## Architecture

- Always use **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state
- **Single source of truth**: Local database is the source of truth. Server data flows through sync into local DB, UI observes local DB
- **Layer separation**: Domain (models, repository interfaces, errors) → Data (implementations, DAOs, mappers) → Presentation (ViewModel, State, Action)
- **Dependency direction**: Data → Domain ← Presentation. Domain is the innermost layer — it depends on nothing. Changes in data/presentation must never impact domain

## Clean Architecture Packaging

- **Never create a top-level `util` package** alongside `data/domain/presentation` — it becomes an undefined fourth layer with no clear access rules. Every utility function belongs to exactly one layer:
  - Date formatting, string formatting for display → `presentation/util`
  - Generic `Result<D,E>` wrapper, domain-level types → `domain/util`
  - HTTP response code parsing, API error mapping → `data/util`
- Create `util` sub-packages *within* each layer, not as a feature-level sibling

## Abstractions — Only When You Need Two Implementations

- Create an interface/abstraction **only if you have or plan to have at least 2 implementations**
- Valid reasons: (1) switching underlying libraries (Ktor vs Retrofit), (2) test doubles (fake implementations for unit tests)
- **Over-abstraction** makes code harder to navigate — clicking through 5+ files to understand a login button is a failure mode
- Don't abstract use cases or mappers just because it feels clean — if there's only ever one implementation, the interface adds noise without value
- If you don't write tests and don't plan to, there's almost never a reason for abstractions beyond repository interfaces

## Use Cases

- Use cases should contain **higher-level business logic** — things the user is explicitly aware of doing (registering, saving a note, making a purchase, exporting data)
- **Not every isolated function is business logic** — `DeleteDigitUseCase` that just calls `pin.dropLast(1)` is pointless. That's a utility function, not business logic
- Use cases are valuable when they **combine multiple data sources** (local DB + remote API + sync scheduler) or orchestrate meaningful side effects (save + fire analytics + schedule retry)
- **Use cases vs. Repositories — it's either/or:**
  - Rich Repository with real orchestration logic → use cases that just delegate are pointless overhead
  - Want real use cases → move orchestration into them and remove the redundant repository class
- Good use cases: `StoreTodoUseCase` (insert locally → sync remotely → schedule retry on failure), `RegisterUseCase`, `ExportDataUseCase`
- Use cases that combine data from multiple repositories (e.g. `UserDataSource` + `TodoDataSource`) are cleaner than forcing the logic into either `UserRepository` or `TodoRepository`
- Implementation details (Ktor, Room, WorkManager) should stay hidden behind interfaces — use cases depend on abstractions, not concrete libraries
- **Use case rules**:
  - One use case = one public function. Multiple public functions = multiple use cases
  - Formatting/display logic (date formatting, social stat formatting) is **presentation logic** — belongs in UI mappers, not use cases
  - Domain layer must be **pure Kotlin** — no Android SDK references (e.g. `Patterns.EMAIL_ADDRESS`). Abstract Android-specific things behind interfaces implemented in the data layer
  - Don't create `SuspendUseCase` interfaces unless you actually need test doubles for them
  - Never return error message strings from use cases — return typed error enums, let the ViewModel map to string resources

## Models & Mappers

- **Domain model** (`Run`) — what the concept *is* in your app's context. Uses convenient Kotlin types (`Duration`, `LocalDateTime`, wrapper classes). Lives in the domain layer
- **Entity** (`RunEntity`) — optimized for DB storage with primitive/serializable fields. Lives in the data layer
- **DTO** (`RunDto`) — optimized for network serialization, fields match JSON structure. Lives in the data layer
- **UI model** (`RunUi`) — pre-formatted strings for display (`"1.34 km"`, `"05:45"`). Lives in the presentation layer. **Optional** — only create when the UI needs heavily formatted/transformed values; simple cases can use the domain model directly
- **Always have separate DTOs/Entities** even if fields match the domain model — field names are implicitly coupled to JSON/DB schema (implementation details that change independently)
- **Mappers are extension functions** in a separate `mappers` file/package — never inside the model class (companion object)
- Data↔Domain mappers go in the **data layer** (`RunEntity.toRun()`, `RunDto.toRun()`)
- Domain→UI mappers go in the **presentation layer** (`Run.toRunUi()`)
- **Never put mappers in the domain layer** — it would create forbidden dependencies on data/presentation models

## MVI: State vs Actions vs Events

- **State** (`data class`): persistent values that affect UI appearance (`isLoading`, `todos`). Survives config changes — re-collected after rotation is expected. Bundle all UI-impacting fields in one state class
- **Actions** (`sealed interface`): user-triggered intents sent **UI → ViewModel** (`ToggleTodo(id)`, `OnSwipeToRefresh`). Pass a single `onAction: (Action) -> Unit` lambda to composables instead of many individual lambdas
- **Never inject services or repositories into composables** — composables only receive state and an `onAction` lambda. All side effects (navigation, API calls, DB writes, service calls) go through `onAction` → ViewModel. The ViewModel is the only place that holds dependencies and orchestrates work
- **Events** (`sealed interface`): one-time signals sent **ViewModel → UI** (`ShowSnackbar(message)`, `NavigateToHome`). Use `Channel(UNLIMITED)` + `receiveAsFlow()` — consumed exactly once, not re-fired after config changes
- **Never put one-time things in State** (snackbar messages, navigation triggers) — they re-fire on every config change because State is re-collected. Use Events instead
- Collect events via a lifecycle-aware `observeAsEvents` utility function, not `LaunchedEffect` on a state field

## No Base Classes — Prefer Composition Over Inheritance

- **Never create `Base___` classes** (`BaseViewModel`, `BaseActivity`, `BaseFragment`) — they violate single responsibility, hide coupling, and accumulate workarounds over time
- **Don't use inheritance to share code or utilities** — that is not what inheritance is for
- Share behavior via **constructor-injected dependencies** (e.g. inject `AnalyticsTracker` instead of calling `trackScreenView()` in a base `init` block)
- Share utilities via **extension functions**, **top-level functions**, or **small focused classes** with clear responsibility
- Use the **delegation pattern** (`by`) when you need polymorphic hierarchy behavior without inheritance downsides
- Not every ViewModel needs state/action/events — don't force MVI structure on static screens or simple cases
- If inheritance is truly needed for architectural enforcement, name it descriptively (e.g. `MviViewModel`, never `BaseViewModel`) and keep it minimal: no utilities, no shared side effects

## Kotlin-first Libraries

- Prefer Kotlin libraries over Java alternatives
- `kotlinx.serialization` over Gson/Moshi
- `kotlinx.coroutines.flow` over RxJava/LiveData
- `kotlin.time.Instant` / `kotlin.time.Clock` over `java.time`
- `kotlin.uuid.Uuid` over `java.util.UUID`
- `kotlinx.collections.immutable` for UI state lists

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

## Error Handling

- Use custom `Result<D, E : Error>` sealed types — never throw exceptions for expected failures, never pass error messages as strings
- Domain `Error` sealed interface as root type — data layer enums implement it:
  ```kotlin
  // domain layer
  sealed interface Error
  sealed interface DataError : Error {
      enum class Network : DataError { RequestTimeout, NoInternet, PayloadTooLarge, ServerError, Unknown }
      enum class Local : DataError { DiskFull, Unknown }
  }
  enum class PasswordError : Error { TooShort, NoUppercase, NoDigit }
  ```
- Map HTTP status codes → error enums in the **data layer** (repository). Map error enums → `UiText` in the **presentation layer**
- **Never pass error message strings from data/domain** — deciding which string to show is presentation logic
- **`UiText` pattern** for string resources in ViewModels (avoids needing `Context`):
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
- `currentCoroutineContext().ensureActive()` before returning errors in catch blocks to respect cancellation
- Never catch `CancellationException` — let it propagate

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
