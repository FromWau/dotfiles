# Exclusive actions: one piece of real work at a time

Some actions do real work that must not run twice: pay a cart, log in as a user, submit an
order, confirm a cash payment. A double tap, a nervous user, or a click that lands while the old
screen is still animating out must not start that work a second time. This file is the pattern
for those actions, derived from click-spam experiments (about 5,000 to 10,000 clicks per run reaching the
ViewModel, exactly one login every time).

## Contents

1. The rules
2. Split the actions by type
3. The ViewModel: `runExclusive` + `ActionOutcome`
4. Validate the action against the source of truth
5. Terminal actions: stay locked, leave the back stack
6. The UI side
7. Failures and exceptions
8. Why not the obvious alternatives (measured)
9. Verifying it: the spam test
10. Mapping to other screens

## 1. The rules

- **One exclusive action at a time per screen.** A repeat that arrives while one is running is
  **dropped**, never queued. A queued repeat is the double payment, just delayed.
- **The ViewModel decides, never the UI.** `onClick` forwards to `onAction` and nothing else.
  The UI's copy of the state is one recomposition behind, so any check there has a gap.
- **The lock lasts as long as the work, and longer if the work ended the screen.** A login that
  navigated away keeps its screen locked until the screen is gone, because the old screen stays
  clickable for a few frames during the transition.
- **Purely local UI actions are never locked.** Toggling a section, typing, show/hide password
  have nothing to conflict with.

## 2. Split the actions by type

Group the work-doing actions under a nested `Exclusive` interface. The call site then shows that
an action can be dropped, and adding a new action forces a decision at compile time.

```kotlin
sealed interface CartAction {
    /** Only one runs at a time; dropped while another exclusive action is still running. */
    sealed interface Exclusive : CartAction {
        data class Pay(val paymentType: PaymentType) : Exclusive
        data class ApplyVoucher(val code: String) : Exclusive
    }

    data class OnVoucherInputChanged(val code: String) : CartAction  // local, never locked
    data object ToggleDetails : CartAction                          // local, never locked
}
```

Different exclusive actions share **one** lock: a voucher must not be applied while the payment
is running, and vice versa (verified: rename and login blocked each other in both directions).

## 3. The ViewModel: `runExclusive` + `ActionOutcome`

`ActionOutcome` is shared by all screens (put it in a common `core` package):

```kotlin
/** What an exclusive action did to its screen. */
enum class ActionOutcome {
    /** The screen stays usable: the lock is released (failure, validation error, local result). */
    Continue,

    /** The action ended the screen (navigated away): it stays locked until its ViewModel is cleared. */
    Finished,
}
```

The ViewModel:

```kotlin
data class CartState(
    val items: ImmutableList<CartItem> = persistentListOf(),
    val isProcessing: Boolean = false,  // the lock AND the UI's "busy" hint, one source of truth
)

fun onAction(action: CartAction) {
    when (action) {
        is CartAction.Exclusive -> runExclusive(action)
        is CartAction.OnVoucherInputChanged -> _state.update { it.copy(voucherInput = action.code) }
        CartAction.ToggleDetails -> _state.update { it.copy(detailsVisible = !it.detailsVisible) }
    }
}

private fun runExclusive(action: CartAction.Exclusive) {
    if (_state.value.isProcessing) {
        Log.tag(TAG).i { "Action locked, ignoring $action" }
        return
    }
    _state.update { it.copy(isProcessing = true) }

    viewModelScope.launch {
        var outcome = ActionOutcome.Continue // an exception or cancellation counts as Continue: unlock
        try {
            outcome = handle(action)
        } finally {
            if (outcome == ActionOutcome.Continue) _state.update { it.copy(isProcessing = false) }
        }
    }
}

private suspend fun handle(action: CartAction.Exclusive): ActionOutcome = when (action) {
    is CartAction.Exclusive.Pay -> pay(action.paymentType)
    is CartAction.Exclusive.ApplyVoucher -> applyVoucher(action.code)
}
```

Details that matter:

- **Read the lock from `_state.value`, never `state.value`.** If `state` is exposed through
  `stateIn(...)`, it's a separate flow that copies `_state` asynchronously and stops copying
  without subscribers; a second action in the same frame could read a stale `false`. The guard
  reads what the ViewModel itself writes.
- **Check and set happen synchronously on the main thread**, before `launch`. `onAction` is
  called on the main thread one call after another, so check-then-set needs no `Mutex`.
- **`handle` is a sequential `suspend fun`.** It returns only when the work is done, so the lock
  spans the whole work. Parallel parts go inside a `coroutineScope { }`, which waits for its
  children. A `viewModelScope.launch` inside `handle` escapes the lock: only use it for work that
  should deliberately outlive it.
- **The `var outcome = Continue` default plus `finally`** is what makes a crash or cancellation
  unlock. Without it a thrown exception leaves the screen locked forever. Don't replace it with
  `runCatching` (swallows `CancellationException`).
- **`isProcessing` is the lock.** No separate `locked` flag: two flags for one fact drift apart.

## 4. Validate the action against the source of truth

An action carries data captured when the frame was drawn. It can arrive after that data changed:
a click lands between the end of one action and the next recomposition, with the old `onClick`
lambda still capturing old values. Measured: after renaming Alice to Alicia, clicks arrived that
still said `OnLogInClicked("Alice")`, a user that no longer existed (2 of them in 1 of 3 runs).

So `handle` checks the action's data against the source of truth (the repository, or `_state`
for screen-local state) before acting, and returns `Continue` when it no longer applies:

```kotlin
is LoginAction.Exclusive.OnLogInClicked ->
    if (userRepo.exists(action.name)) {
        loginAs(action.name)
    } else {
        Log.tag(TAG).i { "Ignoring login for unknown user ${action.name}" }
        ActionOutcome.Continue
    }
```

Prefer the repository over the screen's copy of its data (`_state.users` reaches the state
asynchronously). Let repository writes report whether they applied (`renameUser(...): Boolean`)
and make them atomic with `MutableStateFlow.update { }` instead of read-copy-write.

This is also the answer for **multi-step screens** (enter amount, then confirm): the late second
"OK" of step 1 must not confirm step 2. Make the action say which step it was issued for and
ignore it when `_state.value` is on a different step (`OnConfirm(step = EnterGiven)` while the
state is already `Confirm` → `Continue`). Derived from the same mechanism; not separately measured.

**Stale data in local actions.** The same frame lag hits local actions that send a *whole value*
built in the UI. A keypad that sends `OnChanged(lastDrawnValue + digit)` loses a digit when two
key taps land within one frame: both are built from the same old value. Send the intent instead
(`OnKey(digit)`, `OnDelete`) and let the ViewModel apply it to `_state.value`. Text fields that
own their text (`TextFieldState`) don't have this problem. Found in an eval (PIN keypad); not
measured.

## 5. Terminal actions: stay locked, leave the back stack

A successful login or payment navigates away. The old screen still renders and accepts clicks
for a few frames during the transition. Measured: 81 to 213 clicks landed in that window (~60ms)
per run. Unlocking after success lets them start the work again.

So the handler returns `ActionOutcome.Finished`, and the lock stays:

```kotlin
private suspend fun pay(type: PaymentType): ActionOutcome =
    when (val result = paymentRepo.pay(_state.value.items, type)) {
        is Result.Success -> {
            cart.clear()
            nav.toAndClearAll(Route.PaymentSuccess)  // the cart screen leaves the back stack
            ActionOutcome.Finished
        }
        is Result.Error -> {
            toast.show(result.error.toUiText())
            ActionOutcome.Continue                   // user may retry
        }
    }
```

**The finished screen has to leave the back stack** (`toAndClearAll`, or `toAndClearUpTo` the
right entry). If it stays underneath, its ViewModel survives with the lock still on, and when the
user comes back (logout, back press) the screen is dead. Navigation 3 keys the ViewModel by the
route, so even "clear everything, then push the same `data object` route" hands back the old,
locked ViewModel unless the old entry was removed earlier. Measured both: login dead after
logout while Login stayed in the stack; fresh, working ViewModel once success used
`toAndClearAll(LoggedIn)`.

Don't fix a stuck lock with a reset hook in the UI (`LaunchedEffect` sending `OnEnter`): the
ViewModel's lifetime is the reset. If the screen must stay in the back stack by design, the
terminal outcome isn't `Finished`; reconsider the navigation first.

## 6. The UI side

```kotlin
Button(
    onClick = { onAction(CartAction.Exclusive.Pay(type)) },  // forward only
    enabled = !state.isProcessing,                           // UX hint, not the guard
) {
    if (state.isProcessing) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
            Text("Paying...")
        }
    } else {
        Text("Pay")
    }
}
```

- **Not allowed:** `onClick = { if (!state.isProcessing) onAction(...) }`, click debouncing
  (`rememberDebouncedClick`), local "already clicked" flags. Decision logic belongs in the
  ViewModel, and these checks read lagging state.
- **Allowed:** `enabled = !state.isProcessing` as a visual hint. It may block clicks once the next
  frame is drawn, but correctness must never depend on it.
- **Keep the button's size independent of its content.** A default `CircularProgressIndicator`
  is 40dp and grows a 48dp button; a content-sized `Column` widens when the label changes. Give
  the indicator an explicit size (18dp, 2dp stroke) and size buttons from outside (`height(...)`,
  `weight(1f)`, `fillMaxWidth()` on the container). Don't hide the old label with `alpha(0f)`.
- A spinner only for work that takes noticeable time; for actions that finish in a few ms it is
  flicker.

## 7. Failures and exceptions

- **Expected failures** (timeout, not found, declined payment) are values: the handler maps them
  to `ActionOutcome.Continue` and shows feedback. Verified: a `withTimeoutOrNull` timeout logged
  the failure, released the lock, and the next click started a new attempt.
- **Unexpected exceptions** still unlock (the `finally`), verified. But the lock doesn't catch
  them: they propagate out of `viewModelScope` as uncaught exceptions. On desktop that's a logged
  stack trace; **on Android it crashes the app**. That's deliberate (loud bugs over hidden ones).
  Turn anything that can legitimately fail into a typed result inside the handler instead of
  catching broadly around it.
- **Back/cancel while running: decide by whether the work can be undone.**
  - **Undoable work** (a search, a preview fetch, anything without a lasting side effect): the
    cancel action is *not* exclusive. Keep the `Job` from the `launch`, cancel it from the cancel
    action, and the `finally` unlocks.
  - **Work with a lasting side effect** (login, payment, submitting an order): cancelling the
    coroutine doesn't undo what the server or service already did. A Back that navigates away
    while it runs can leave a logged-in user on the lockscreen, or a paid cart on screen. Make
    Back an `Exclusive` action too: it's dropped while the work runs, and when it runs, it
    navigates away and returns `Finished`. Found by both agents in an eval on a PIN login screen.

## 8. Why not the obvious alternatives (measured)

| Approach | What happened |
|---|---|
| No guard | double click → two jobs, back stack `[Login, LoggedIn, LoggedIn]` |
| Boolean set/reset around a synchronous `onAction` body | released as soon as `launch` returned, never seen as set: every double click got through |
| `submitJob?.isActive` lock around fast work | job done in ~7ms, second click ~13ms later on the still-visible screen: double navigation |
| `isSubmitting` flag reset only on error, screen kept in back stack | login dead after logout (Navigation 3 reused the locked ViewModel) |
| UI debounce / `if` in `onClick` | wrong layer; reads state that lags a frame; time-based guess |
| `Mutex.lock()` | queues the repeat instead of dropping it |
| This pattern | 1 login out of about 5,000 to 10,000 clicks reaching the ViewModel, including 81 to 213 late clicks after navigation; timeout and exception both unlock |

## 9. Verifying it: the spam test

Prove the guard with real timing, not by reading the code. With an in-process UI harness (for
example the `kmp-ui-harness` skill's control server):

1. Click the button in a tight loop over one keep-alive connection (about 5,000 clicks/s), for longer
   than the work takes, and count the app's log lines: exactly one "doing the work" line, the rest
   "Action locked".
2. **Click by coordinates, not by label** once the button's text changes while loading
   ("Pay" → "Paying..."): a label lookup misses and the test silently stops clicking.
3. Read coordinates from the layout on every run; the window size changes between launches.
4. A harness that invokes the semantics click action **bypasses `enabled`**, so this exercises the
   ViewModel guard itself. That's the stronger test; it doesn't show what `enabled` adds for real
   pointer input.
5. Also run: login → logout → login (the lock must not survive), a forced timeout and a forced
   exception (both must unlock), an exclusive action during another one (dropped), a local action
   during one (works), and a click with stale data right after a change (ignored).

## 10. Mapping to other screens

| Screen | Exclusive | Outcome on success | Local (never locked) |
|---|---|---|---|
| Login | `OnLogInClicked(name)`, `OnBack` (login can't be undone) | `Finished` (navigate, clear stack) | toggle password visibility, typing |
| Cart | `Pay(type)`, `ApplyVoucher(code)` | `Pay` → `Finished`; voucher → `Continue` | quantity input, expand details |
| Cash payment (multi-step) | `OnConfirm(step)`, `OnBack(step)` | final confirm → `Finished`; step change → `Continue` + step check | amount input |
| Rename / edit | `Rename(old, new)` | `Continue` (stays on screen), validate `old` still exists | text field input |
