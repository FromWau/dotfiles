---
name: mvi
description: Presentation-architecture tier for Android/KMP apps (KMP-shared, not Android-only — ViewModel and Koin both run in Compose Multiplatform). The **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state; State vs Actions vs Events and why one-time signals (snackbars, navigation) go through a `Channel` + `observeAsEvents` rather than State; **Koin** dependency injection (`singleOf(::Impl) bind Interface::class`, constructor injection); **ViewModel lifecycle** (`onCleared`, a `Session` singleton only for app-wide shared state); **getting a screen's inputs into a ViewModel**, ranked by app shape (Navigation 3 route → Fragment `arguments` + `SavedStateHandle` → `Fragment.init(...)` + `ViewModel.init()` with an `Initializing` state when a callback param forces it; idempotent re-init across recreation); and **composable-scoped ViewModels** (`rememberViewModelStoreOwner` + `LocalViewModelStoreOwner`, one VM per list item/card/sheet — `references/viewmodel-scoping.md`). Load whenever the work touches ViewModels, `SavedStateHandle`, fragment arguments or a VM `init` function, MVI state/actions/events, a `StateFlow` state machine, one-time UI events, Koin modules, or scoping a ViewModel — even when the user doesn't name the skill. Pair with `compose` (the UI this drives), `kotlin` (the `Result<D, E>` type these return), and `software-design` (the layering/dependency-direction rules MVI sits inside). For building the Compose UI itself — `remember`, state hoisting, Styles, adaptive layout — load `compose`, not this.
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
- Pass a screen's inputs (an id, the error to show) the way the app navigates — Navigation 3 route, Fragment arguments, or `Fragment.init(...)`; see "Getting data into a ViewModel" below. Keep a central `Session` singleton only for app-wide state that many screens share (logged-in user, cart), not as a way to hand one screen its parameters
- A VM no longer needs a backstack entry — with lifecycle 2.11 you can scope one to *any*
  composable (per list item/card/bottom sheet) via `rememberViewModelStoreOwner` + a
  `LocalViewModelStoreOwner` override. Reach for this only on complex screens with
  independently-stateful subcomponents, not plain lists. For the pattern, state-ownership
  rules, the "one hot source / cheap per-item slices" performance rule, and KMP/CMP
  availability, read `references/viewmodel-scoping.md`

## Getting data into a ViewModel — pick by app shape, best first

**1. Best — single Activity, single Fragment, Compose + Navigation 3.** The route (a Navigation 3 key) carries the screen's params; pass them with the route and hand them to the entry's ViewModel. No Bundle, no `init`, no `Initializing` state.

**2. Next — single Activity, multiple Fragments.** Put basic params in the Fragment's `arguments` through a companion factory (`fun newInstance(...) = XFragment().apply { arguments = bundleOf(...) }`); a `@HiltViewModel` receives them in its `SavedStateHandle` and builds its state in its property initializers. The state exists the moment the VM does — no `Initializing` state, no "has `init` run yet?" guard — and survives recreation and process death.

**3. Worst — single Activity, multiple Fragments, and a param is a callback** (non-Parcelable, e.g. into a legacy non-VM state machine). A Bundle can't carry it, so:
- A static `XFragment.init(...)` factory writes the plain params into `arguments` and keeps the callback as a fragment property.
- The MVI state needs an `Initializing` state; the VM is late-initialized by `viewModel.init(state, callback)`, called from `Fragment.onViewCreated()`.
- The fragment reads its own arguments and builds the state — don't *also* add `SavedStateHandle` for the data; the keys stay in one owner.
- Make `init` idempotent: a recreated fragment calls it again *without* the callback (it was never in the Bundle); return early if already initialized, so the retained VM keeps state + callback across config changes.
- It won't survive process death — the VM is new and the callback is gone, usually along with whatever it pointed at. Fail loudly (`error("missing callback")`) rather than show a screen whose exit does nothing.

| | 1. Navigation 3 route | 2. Fragment `arguments` → `SavedStateHandle` | 3. `Fragment.init(...)` + `ViewModel.init(...)` |
|---|---|---|---|
| App shape | 1 Activity, 1 Fragment, Compose | 1 Activity, many Fragments | same as 2, plus a callback param |
| Params travel in | the route key | the Fragment Bundle | the Bundle (plain params) + a fragment property (callback) |
| State available | at VM creation | at VM creation | after `onViewCreated` → `init` |
| `Initializing` state / re-init guard | no | no | yes |
| Survives process death | yes | yes | no (callback lost) |
