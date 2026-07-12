---
name: mvi
description: Presentation-architecture tier for Android/KMP apps (KMP-shared, not Android-only — ViewModel and Koin both run in Compose Multiplatform). The **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state; State vs Actions vs Events and why one-time signals (snackbars, navigation) go through a `Channel` + `observeAsEvents` rather than State; **Koin** dependency injection (`singleOf(::Impl) bind Interface::class`, constructor injection); **ViewModel lifecycle** (`onCleared`, the central `Session` singleton instead of passing data through nav routes); and **composable-scoped ViewModels** (`rememberViewModelStoreOwner` + `LocalViewModelStoreOwner`, one VM per list item/card/sheet — `references/viewmodel-scoping.md`). Load whenever the work touches ViewModels, MVI state/actions/events, a `StateFlow` state machine, one-time UI events, Koin modules, or scoping a ViewModel — even when the user doesn't name the skill. Pair with `compose` (the UI this drives), `kotlin` (the `Result<D, E>` type these return), and `software-design` (the layering/dependency-direction rules MVI sits inside). For building the Compose UI itself — `remember`, state hoisting, Styles, adaptive layout — load `compose`, not this.
---

# MVI / Presentation Architecture

The **presentation-architecture tier**: the ViewModel/state-machine side of an Android or Compose-Multiplatform app. It produces the `state` and consumes the `onAction` that the UI (**`compose`**) is bound to. This layer is KMP-shared — ViewModel (`androidx.lifecycle`) and Koin both run in Compose Multiplatform. Companions to load alongside this one:
- **`compose`** — the UI-rendering tier this drives (stateless composables, the `onAction` contract, `UiText`).
- **`kotlin`** — the `Result<D, E>` type and coroutines/flows these ViewModels return and consume.
- **`software-design`** — layering, dependency direction, single-source-of-truth, and the typed-error philosophy MVI sits inside.

## When to read references

- **`references/viewmodel-scoping.md`** — composable-scoped ViewModels (lifecycle 2.11 `rememberViewModelStoreOwner`/`LocalViewModelStoreOwner`), one VM per list item/card/sheet, state ownership across multiple VMs, keeping many scoped VMs + per-item flows cheap, KMP/CMP availability. Read when scoping a VM to anything smaller than a screen.

## Architecture — MVI

- Always use the **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state.
- The layering, dependency direction, and single-source-of-truth rules that MVI sits inside are in **`software-design`**; the `Result`/error types it returns are in **`kotlin`**; the stateless-composable UI side is in **`compose`**.
- Not every ViewModel needs state/action/events — don't force MVI structure on static screens or simple cases.

## MVI: State vs Actions vs Events

- **State** (`data class`): persistent values that affect UI appearance (`isLoading`, `todos`). Survives config changes — re-collected after rotation is expected. Bundle all UI-impacting fields in one state class
- **Actions** (`sealed interface`): user-triggered intents sent **UI → ViewModel** (`ToggleTodo(id)`, `OnSwipeToRefresh`). Pass a single `onAction: (Action) -> Unit` lambda to composables instead of many individual lambdas
- **Events** (`sealed interface`): one-time signals sent **ViewModel → UI** (`ShowSnackbar(message)`, `NavigateToHome`). Use `Channel(UNLIMITED)` + `receiveAsFlow()` — consumed exactly once, not re-fired after config changes
- **Never put one-time things in State** (snackbar messages, navigation triggers) — they re-fire on every config change because State is re-collected. Use Events instead
- Collect events via a lifecycle-aware `observeAsEvents` utility function, not `LaunchedEffect` on a state field

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
