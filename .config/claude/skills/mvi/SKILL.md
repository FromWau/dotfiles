---
name: mvi
description: Presentation-architecture tier for Android/KMP apps (KMP-shared, not Android-only — ViewModel and Koin both run in Compose Multiplatform). The **MVI pattern** (Model-View-Intent): ViewModel exposes `StateFlow<State>`, UI sends `Action`, ViewModel reduces state; **exclusive actions** for work that must not run twice (pay a cart, log in, submit, confirm a payment: `Action.Exclusive` + `runExclusive` + `ActionOutcome`; double tap/click/submit, duplicate navigation, debounce, `isProcessing`/`submitJob`/`Mutex` guards, stale action data, `references/exclusive-actions.md`); State vs Actions vs Events and why one-time signals (snackbars, navigation) go through a `Channel` + `observeAsEvents` rather than State; **Koin** dependency injection (`singleOf(::Impl) bind Interface::class`, constructor injection); **ViewModel lifecycle** (`onCleared`, a `Session` singleton only for app-wide shared state, and one fixed hook set for route ViewModels: `RouteLifecycle` with `onEnter`/`onStart`/`onStop`/`onLeave` driven by a `RouteLifecycleEffect`, preferred over `onCleared` and legacy Fragment method names); **getting a screen's inputs into a ViewModel**, ranked by app shape (Navigation 3 route → Fragment `arguments` + `SavedStateHandle` → `Fragment.init(...)` + `ViewModel.init()` with an `Initializing` state when a callback param forces it; idempotent re-init across recreation); and **composable-scoped ViewModels** (`rememberViewModelStoreOwner` + `LocalViewModelStoreOwner`, one VM per list item/card/sheet — `references/viewmodel-scoping.md`). Load whenever the work touches ViewModels, `SavedStateHandle`, fragment arguments or a VM `init` function, MVI state/actions/events, a `StateFlow` state machine, one-time UI events, Koin modules, or scoping a ViewModel — even when the user doesn't name the skill. Pair with `compose` (the UI this drives), `kotlin` (the `Result<D, E>` type these return), and `software-design` (the layering/dependency-direction rules MVI sits inside). For building the Compose UI itself — `remember`, state hoisting, Styles, adaptive layout — load `compose`, not this.
---

# MVI / Presentation Architecture

The **presentation-architecture tier**: the ViewModel/state-machine side of an Android or Compose-Multiplatform app. It produces the `state` and consumes the `onAction` that the UI (**`compose`**) is bound to. This layer is KMP-shared — ViewModel (`androidx.lifecycle`) and Koin both run in Compose Multiplatform. Companions to load alongside this one:
- **`compose`** — the UI-rendering tier this drives (stateless composables, the `onAction` contract, `UiText`).
- **`kotlin`** — the `Result<D, E>` type and coroutines/flows these ViewModels return and consume.
- **`software-design`** — layering, dependency direction, single-source-of-truth, and the typed-error philosophy MVI sits inside.

## When to read references

- **`references/exclusive-actions.md`**: actions that do real work and must not run twice (pay, log in, submit, confirm): `Action.Exclusive`, `runExclusive` with `isProcessing` as the lock, `ActionOutcome.Continue`/`Finished`, validating stale action data, terminal navigation (`toAndClearAll`), the UI rules, failure handling, measured pitfalls, and the click-spam test. Read before adding any guard against repeated input or reviewing one.
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

## Exclusive actions (work that must not run twice)

- Actions that do real work (pay, log in, submit) live in a nested `sealed interface Exclusive`; local UI actions (toggles, typing) stay outside and are never locked.
- With only **one** exclusive action, keep the `Exclusive` interface as the marker but skip `runExclusive`/`handle`/`ActionOutcome`: the action's own function guards with `if (_state.value.isProcessing) return` and sets the lock. Build the full mechanism once a second exclusive action arrives; the marker is what tells you it is needed.
- Checks that keep the screen where it is (a config error, a busy service) run *before* the lock is set, and every path that stays on the screen, a caught exception included, clears it again. A `return` after the lock leaves the button and every other exclusive action dead for good.
- One lock per screen: `runExclusive` drops the action if `_state.value.isProcessing` (never `state.value`), otherwise sets it and launches `handle(action)`, a sequential `suspend fun` returning `ActionOutcome`. `Continue` unlocks (also on exception/cancellation via `finally`); `Finished` (navigated away) stays locked and the screen leaves the back stack.
- The ViewModel decides: `onClick` only forwards; `enabled = !state.isProcessing` is a UX hint, never the guard. No debounce, no `if` in `onClick`, no `LaunchedEffect` reset hooks.
- Validate the action's data against the source of truth before acting; a click can arrive carrying values from the previous frame.
- Actions carry intent, never UI state the ViewModel owns: no `OnConfirm(step)`. On multi-step screens name each button's intent (`OnConfirmGiven`, `OnConfirmPayment`) and ignore it when `_state.value` is on another step.
- Back/cancel during the work: if the work can be undone, cancel its job; if not (login, payment), Back is `Exclusive` too.
- A rule several entry points must obey (may the user cancel now?) is one derived property on the state (`val canCancel get() = isCancellable || isUnlockedByErrorTimer`). The button, the timeout and any dialog all check it, and a timer that fires while it is false waits with `_state.first { it.canCancel }`. A per-entry check drifts: the timeout cancelled a chip write that the button correctly refused.
- Full pattern, measurements, and the spam test: `references/exclusive-actions.md`.

## Dependency Injection

- Use Koin with `singleOf(::Impl) bind Interface::class`
- Constructor injection over field injection

## ViewModel Lifecycle

- Use `onCleared()` for cleanup (session logout, closing resources); a route ViewModel prefers its `RouteLifecycle` hooks (below)
- Pass a screen's inputs (an id, the error to show) the way the app navigates — Navigation 3 route, Fragment arguments, or `Fragment.init(...)`; see "Getting data into a ViewModel" below. Keep a central `Session` singleton only for app-wide state that many screens share (logged-in user, cart), not as a way to hand one screen its parameters
- A VM no longer needs a backstack entry — with lifecycle 2.11 you can scope one to *any*
  composable (per list item/card/bottom sheet) via `rememberViewModelStoreOwner` + a
  `LocalViewModelStoreOwner` override. Reach for this only on complex screens with
  independently-stateful subcomponents, not plain lists. For the pattern, state-ownership
  rules, the "one hot source / cheap per-item slices" performance rule, and KMP/CMP
  availability, read `references/viewmodel-scoping.md`
- **Route ViewModels share one fixed hook set** instead of each screen inventing public `onStart`/`onCreateView`/`onViewShown` names. A small interface with no-op defaults, driven by one effect every route calls:

  ```kotlin
  interface RouteLifecycle {
      fun onEnter() {}  // page shown: arrival + return from a later route, NOT after a screen lock
      fun onStart() {}  // visible, also again after a screen lock
      fun onStop() {}
      fun onLeave() {}  // page gone: a later route is on top, the route was popped, or a config change
  }

  @Composable
  fun RouteLifecycleEffect(viewModel: RouteLifecycle) {
      DisposableEffect(viewModel) { viewModel.onEnter(); onDispose { viewModel.onLeave() } }
      LifecycleStartEffect(viewModel) { viewModel.onStart(); onStopOrDispose { viewModel.onStop() } }
  }
  ```

  A route ViewModel uses these overrides, not its own `onCleared`: pair each setup with its hook (`onEnter`/`onLeave`, `onStart`/`onStop`) so the route owns its resources only while it is shown, and the class has one place to look for teardown. `init` keeps only what lives as long as the ViewModel (flow collectors into its own state); it needs no teardown because `viewModelScope` ends with it. `onLeave` also fires on a configuration change; when work started in a hook must not stop then, still cancel it in `onLeave`, restart it from `onEnter`/`onStart`, and tie each async callback to the job that started it (`if (task !== startedTask) return`) so the cancelled job's late callback cannot act on the new one. Reach for `onCleared` only when even that is impossible (an operation that must not be interrupted mid-way, such as a chip write), and say why in a one-line comment. Don't add `onInit`/`onTeardown` either; `init` already covers route creation. `onEnter`/`onLeave` mean "page shown/gone" only when the host composes just the top back-stack entry. Pick the hook by *when* the work must rerun: view-setup work that a screen lock must not redo (clearing a cart, reloading a list, restarting a selection timer) goes in `onEnter`; visibility work (NFC/listeners on, side menu closed) in `onStart`/`onStop`.
- **Work that must run once but needs the screen visible** (a chip write started from `onStart`): `onStart` runs again after a screen lock, so guard it with one atomic state instead of several booleans:
  ```kotlin
  private val writeTask = AtomicReference(WriteTask.NotStarted)
  override fun onStart() { if (writeTask.compareAndSet(WriteTask.NotStarted, WriteTask.Running)) startWrite() }
  // the task's end callbacks: writeTask.set(WriteTask.Ended)
  override fun onCleared() { if (writeTask.get() == WriteTask.Running) stopWrite() }
  private enum class WriteTask { NotStarted, Running, Ended }
  ```
  `isStarted` + `isEnded` flags allow combinations that mean nothing and can't be checked and set in one step.
- **Order in the class:** `init {}`, then the hooks directly below it in lifecycle order (`onEnter`, `onStart`, `onStop`, `onLeave`), then the private functions. A reader sees what the route sets up and tears down before any detail.
- **Porting a legacy Fragment:** fold its lifecycle methods (`onCreateView`, `onViewCreated`, `onDestroyView`, `onStart`…) into the matching hook bodies instead of keeping them as private wrappers; `override fun onEnter() { onCreateView(); onViewCreated() }` is one indirection too many. Other legacy method names that carry meaning (`refreshUI`, `buttonBuy`…) may stay as private functions so the port still reads side by side with the old fragment.

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
