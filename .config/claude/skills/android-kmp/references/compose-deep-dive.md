# Jetpack Compose Deep Dive

## State Retention

Choosing the right state API:
- `remember { }` — survives recomposition only. Use for transient UI state (animation values, scroll position)
- `retain { }` — survives recomposition + configuration changes. Does **not** require serialization. Use for non-serializable objects that must survive rotation (e.g. ExoPlayer instance, Bitmap). Does **not** survive process death
- `rememberSaveable { }` — survives recomposition + config changes + process death. **Requires** the value to be serializable/parcelable. Use for user input, form state, selected IDs
- **Default to ViewModel + `SavedStateHandle`** for real app state — better testability, architecture, and process death survival
- `retain` is acceptable for quick local UI state that doesn't need process death survival, or for library code that shouldn't couple to ViewModels

`RetainedEffect` vs `DisposableEffect`:
- `DisposableEffect` `onDispose` fires on **any** composition exit (including config changes)
- `RetainedEffect` `onRetire` fires only when leaving composition for reasons **other than** config changes — use for resources that should survive rotation but clean up on back navigation (e.g. ExoPlayer: init in body, `player.release()` in `onRetire`)

## UI State Modeling

Immutability:
- All `data class` types used in Compose UI state must be annotated `@Immutable`
- All `List` types in UI state must be `ImmutableList` (from `kotlinx.collections.immutable`)

Sealed Interface for Sub-States / Pages:
```kotlin
@Immutable
sealed interface Page {
    data class Summary(val items: ImmutableList<Item>) : Page
    data class Details(val item: Item) : Page
    data object Done : Page
}
```

Root UI State Pattern:
- The root state `data class` must be constructable with **no parameters** (all fields have defaults)
- Store each page/sub-state as a separate field so data is **retained** when navigating between pages — the ViewModel controls clearing
- Include a `Page` enum that mirrors the sealed interface variants for tracking the current page:
```kotlin
@Immutable
data class HomeState(
    val pageSummary: Page.Summary = Page.Summary(),
    val pageDetails: Page.Details = Page.Details(),
    val currentPage: Page = Page.Summary,
) {
    enum class Page { Summary, Details, Done }
}
```
- This keeps page data alive across navigation; the ViewModel decides when to reset individual page state

## Form Focus & Keyboard Management

IME action flow for multi-field forms:
- All intermediate fields: `KeyboardOptions(imeAction = ImeAction.Next)` + `KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })`
- Last field: `KeyboardOptions(imeAction = ImeAction.Done)` + `KeyboardActions(onDone = { focusManager.clearFocus(); submitForm() })`
- All text fields in a form must be `singleLine = true` (multi-line shows Enter key, not the IME action button)

Focus management APIs:
```kotlin
val focusRequester = remember { FocusRequester() }
val focusManager = LocalFocusManager.current

// Assign to TextField:
TextField(modifier = Modifier.focusRequester(focusRequester), ...)

// Programmatically focus (e.g. on button click):
focusRequester.requestFocus()

// Move to next field (in onNext keyboard action):
focusManager.moveFocus(FocusDirection.Down)

// Dismiss keyboard (in onDone keyboard action):
focusManager.clearFocus()
```

## UX Best Practices

1. **Touch targets**: Always put clickable icons inside `IconButton` — never make a raw `Icon` clickable. Default `IconButton` touch target is 48dp. For custom small clickables, manually set minimum touch target size
2. **Validate text fields on focus loss**, not on submit — users should see errors before hitting the button
3. **IME actions**: Use `ImeAction.Next` to move between fields, `ImeAction.Done` on the last field — never leave the default `Enter` for email/password fields
4. **Single primary action per screen** — secondary actions should use `OutlinedButton` or `TextButton` to reduce visual prominence
5. **Primary action placement** — bottom-right of the screen (closest to right thumb). Destructive confirm buttons should use error color
6. **Destructive dialog wording** — use specific action verbs ("Discard", "Delete") not generic labels ("Confirm", "OK")
7. **Character counters** for text fields with length limits — show real-time count, disable submit when exceeded
8. **Color contrast** — minimum 4.5:1 ratio (WCAG AA) for normal text. Use a contrast checker tool during design
9. **Defer permission requests** — only request permissions at the moment they are needed (e.g. microphone when recording starts, not on app launch)
10. **Process death restoration** — use `SavedStateHandle` in ViewModels for screens where users invest significant input time before saving

## Pagination

**Manual pagination over Jetpack Paging library** for single data sources (API or DB, not both):
- Full ownership of the list — easy to mutate individual items (e.g. toggle like)
- Use Jetpack Paging only when paginating from both local DB and remote simultaneously

Generic `Paginator<Key, Item>` class — reusable across all view models:
- `Key` = page identifier type (e.g. `Int` for page number, `Instant` for cursor-based)
- `Item` = API response type
- Constructor lambdas: `initialKey`, `onLoadUpdated`, `onRequest(nextKey) → Result<Item>`, `getNextKey(currentKey, result) → Key`, `onError`, `onSuccess(result, newKey)`, `endReached(currentKey, result) → Boolean`
- `loadNextItems()` guards against concurrent requests and already-reached end
- `reset()` resets key and `endReached` flag to restart pagination

Scroll-to-end detection in the composable:
```kotlin
LaunchedEffect(products) {
    snapshotFlow { lazyListState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
        .distinctUntilChanged()
        .collect { lastIndex ->
            if (lastIndex == state.products.lastIndex) viewModel.loadNextItems()
        }
}
```

Loading indicator — add as last `item {}` in `LazyColumn` when `isLoadingMore` is true

## Performance

### 1. Understand Compose's Three Phases — Defer State Reads

Compose processes each frame in three phases: **Composition → Layout → Drawing**. Changes that only affect drawing (rotation, scale, alpha, translation) should not trigger recomposition. Use `Modifier.graphicsLayer` to defer state reads to the drawing phase:
```kotlin
// BAD — reads state during composition, recomposes every frame
Icon(modifier = Modifier.rotate(rotation.value))

// GOOD — reads state only in the drawing phase, zero recompositions
Icon(modifier = Modifier.graphicsLayer { rotationZ = rotation.value })
```

### 2. No Side Effects Directly in Composition

Never execute non-composable lambdas/functions directly in a composable body — they re-execute on every recomposition. Use effect handlers:
```kotlin
// BAD — fires on every recomposition where count >= 10
if (count >= 10) { onThresholdReached(count) }

// GOOD — only fires when count actually changes
LaunchedEffect(count) {
    if (count >= 10) { onThresholdReached(count) }
}
```

### 3. Use `key()` for Reorderable Non-Lazy Layouts

Not just for `LazyColumn` — use `key()` in any layout where items reorder (dashboards, dynamic forms) so Compose moves composables without recomposing:
```kotlin
// BAD — recomposes both items on every swap
fields.forEach { field -> FormFieldItem(field) }

// GOOD — Compose moves by identity, skips recomposition
fields.forEach { field ->
    key(field.id) { FormFieldItem(field) }
}
```

### 4. Don't Pass Entire MVI State to Child Composables

Passing a whole state data class means the child recomposes when any field changes. Pass only the specific fields each child needs:
```kotlin
// BAD — UserHeader recomposes when notificationCount changes
UserHeader(state = screenState)

// GOOD — only recomposes when its own data changes
UserHeader(username = screenState.username, followerCount = screenState.followerCount)
```
Exception: acceptable if the child uses 80-90%+ of the state fields.

### Recomposition notes

- Only **structural changes** (UI tree changes) require recomposition — layout/draw changes don't have to
- Lambdas are compared by **reference**, not value — a recreated lambda triggers recomposition even if its body is identical
- Use `rememberUpdatedState(value)` to freeze a lambda reference while keeping its return value current (prevents recomposition caused by frequently-changing captured values)
- Remember stable values (e.g. IDs) without keys — `val id = remember { person.id }` — so lambdas that capture them aren't recreated on every recomposition
- For lists where individual items change independently, use `mutableStateListOf<T>()` in the ViewModel instead of a `List<T>` in the state class — Compose can then track each item separately and skip unaffected items
- **Don't premature-optimize recompositions** — only investigate if you have measurable UI jank. Use Layout Inspector's skip counts (gray numbers) to diagnose

### 5. Main Safety — `withContext(Dispatchers.IO)` for Blocking Calls

`viewModelScope` uses `Dispatchers.Main`. Blocking operations freeze the UI even inside a coroutine. Switch dispatchers inside the suspend function, not at the call site:
```kotlin
// BAD — blocks the main thread
suspend fun loadUserData(): UserData {
    val content = readLargeFile() // blocking
    return processData(content)   // blocking
}

// GOOD — main-safe
suspend fun loadUserData(): UserData = withContext(Dispatchers.IO) {
    val content = readLargeFile()
    processData(content)
}
```

## Stateful vs Stateless Composables

**Default: always stateless.** ViewModel handles all state — even form input. This makes all UI mockable, testable, and previewable.

- **Stateless**: receives state as parameters, exposes lambdas for changes. State lives in ViewModel. Full control over when/how state updates. Business logic testable with unit tests
- **Stateful**: composable manages its own `remember { mutableStateOf(...) }` internally. Self-contained but state can't be controlled or reset from outside — only testable with expensive UI tests

Only use stateful composables for purely internal UI behavior that will never need external control:
- Dropdown open/close
- Animation state
- Drag state tightly bound to the UI

Never use stateful for:
- Text field content — ViewModel must own it so it can validate, reset, or pre-fill
- Any state a ViewModel might need to read or mutate

If you do use local `remember`: use `rememberSaveable` for anything that should survive config changes (rotation, theme switch)

## UI Tips

Auto-sizing text — use `BasicText` with `autoSize` instead of manually mapping `WindowSizeClass` to SP values:
```kotlin
BasicText(
    text = "Hello",
    style = TextStyle(/* ... */),
    maxLines = 1,
    autoSize = TextAutoSize.StepBased(
        minFontSize = 24.sp,
        maxFontSize = 38.sp,
        // stepSize defaults to 0.25.sp
    )
)
```
- Auto-size scales based on the **container size** — requires a constrained height (e.g. `maxLines`) to actually scale down
- Without `maxLines`, text wraps freely and always uses max font size
