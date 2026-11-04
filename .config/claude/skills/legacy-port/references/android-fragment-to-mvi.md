# Android: legacy Fragment → Compose + MVI view model

## Lifecycle mapping

| Legacy | New (route view model, see `mvi` → `RouteLifecycle`) | Reruns on |
|---|---|---|
| constructor / `onCreate` | `init` | route pushed |
| `onCreateView` + `onViewCreated` | `onEnter` | page shown: arrival and return from a later page, config change; not screen lock |
| `onStart` / `onStop` | `onStart` / `onStop` | every visibility change, including screen lock |
| `onDestroyView` | `onLeave` | page gone |
| `onDestroy` | `onCleared` | route popped |

Keep the legacy method names private and call them from the hooks:
`override fun onEnter() { onCreateView(); onViewCreated() }`. A page that can never be returned to may
run its view-creation work in `init`.

Base classes count as part of the scope: e.g. a `FullscreenBaseFragment` that disables the side menu in
`onViewCreated` and closes it in `onStop` must be ported into every view model whose fragment extended it.

## Mechanism translations

| Legacy | New |
|---|---|
| `block()` / `isBlocked()` / `Consumable.consume()` | exclusive action: `isProcessing` lock, `ActionOutcome.Continue` unlocks, `Finished` keeps it while a later route is on top; one consumable shared by two buttons → both actions exclusive on the same lock |
| `CustomCountDownTimer(ms, interval, listener)` | `viewModelScope.launch { delay(duration); onTimerFinished() }`, cancelled where legacy cancelled it |
| `changeFragment(SecurityHelper.createAppFragment())` / go to start | navigate to the start route clearing the back stack |
| `PopUpMsg` / Toast popups for the customer | Compose dialog driven by state, auto-dismiss if legacy had a timeout |
| `viewModel.getString(...)` with a per-screen language | the app's event/customer language service |
| adapter `handleOnClick` / `onItemClicked` / filters | private functions in the view model with the adapter's names; the UI gets plain tile data classes and sends actions |
| static deprecated helpers (`NumberFormatter.x`) | their replacement (`INewNumberFormatter`), same call |
| `catch (CheckedException e)` that nothing in the path throws | nothing to port; cite where the exception is actually thrown |
| `isAllowed()` (fragment security contract) | check for a caller first; it is often dead |
