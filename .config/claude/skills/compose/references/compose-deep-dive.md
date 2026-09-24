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
- All `data class` types used in Compose UI state must be `@Immutable`, directly or through a supertype (see below)
- All `List` types in UI state must be `ImmutableList` (from `kotlinx.collections.immutable`)

`@Immutable`/`@Stable` is inherited through supertypes, so annotate the sealed root once, not every leaf:
- The compiler's `stabilityOf` checks `hasStableMarkedDescendant()` (walks `superTypes`) *before* its "interface → Unknown" fallback. So a nested sealed sub-interface and every leaf under an annotated root count as stable — including a composable parameter typed as the sub-interface (`state: ScreenState.Loaded`) or a single leaf.
- Annotating a nested sub-interface or leaf too is redundant but harmless; do it only if it reads better at a parameter's declaration site.
- The marker is an unchecked promise: it skips field analysis, so a leaf holding a mutable type (a `List` that is really a `MutableList`, a `var`) is still reported stable and recomposition silently breaks. Keep every leaf to `val`s of immutable types.

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

## Adaptive Sizing — the Size-object Pattern

For screens that adapt to device classes (phone/tablet/desktop, or project-specific
types like `LocalDeviceType`), collect all adaptive dimensions and text styles into
one `XSize` type per screen — never scatter `LocalDeviceType.current` /
`WindowSizeClass` reads through child composables.

```kotlin
object CheckoutSize {
    @Immutable
    data class FooterSize(
        val height: Dp,
        val buttonTextStyle: TextStyle,
    )

    val footer: FooterSize
        @Composable @ReadOnlyComposable get() {
            return when (LocalDeviceType.current) {   // adaptive resolution lives ONLY here
                is DeviceType.MobilePortrait -> FooterSize(80.dp, MaterialTheme.typography.headlineMedium)
                else -> FooterSize(100.dp, MaterialTheme.typography.headlineLarge)
            }
        }
}

@Composable
fun CheckoutScreen(
    state: CheckoutState,
    onAction: (CheckoutAction) -> Unit,
    modifier: Modifier = Modifier,
    size: CheckoutSize = CheckoutSize,        // injected at the ROOT
) {
    Footer(size = size.footer)                // getters read off the param, once
}

@Composable
private fun Footer(
    size: CheckoutSize.FooterSize,            // children take plain data params
    modifier: Modifier = Modifier,
) { /* uses size.height, size.buttonTextStyle */ }
```

The rules and why they matter:

- **Screen-level Size type is an `object`** with `@Composable @ReadOnlyComposable`
  property getters returning nested `@Immutable` data classes. The getters are the
  single place where the device class is resolved.
- **Inject at the root**: the screen composable takes `size: XSize = XSize`. Tests
  and previews get one seam to control sizing for the whole screen instead of having
  to fake the device CompositionLocal for the entire tree.
- **Pipe sub-sizes down**: children receive the resolved data classes
  (`XSize.FooterSize`) as ordinary parameters. A child that reads `XSize.footer` or
  `LocalDeviceType.current` itself silently re-couples the tree to global state and
  breaks the injection seam.
- **Reusable components** (a keyboard, a card — anything used by multiple screens)
  may instead expose an `@Immutable data class` Size with a device-derived default
  (`size: KeyboardSize = KeyboardSize.fromDeviceType()`), so each caller or test can
  pass a fully custom instance.
- Layout weights, paddings, and text styles that vary by device all belong in the
  Size type — if a `when (deviceType)` appears inside a composable body, that value
  should move into the Size getter instead.
- Fixed-height blocks that contain dynamic content (error messages, growing lists)
  should use `heightIn(min = size.x)` rather than `height(size.x)` so content can
  never be silently clipped on the smallest device class.

## Theming & Color Inheritance — `Surface` vs a nested `MaterialTheme`

`Surface` publishes exactly two things to its children:

```kotlin
CompositionLocalProvider(
    LocalContentColor provides contentColor,
    LocalAbsoluteTonalElevation provides absoluteElevation,
) { ... }
```

It does **not** publish its own background color, and Material has no
`LocalSurfaceColor` / `LocalBackgroundColor`. That asymmetry is deliberate: content
color is *inherited* (text and icons drawn on top must know what they sit on), while
background is *declared* by each container. Three consequences bite in practice:

- **A child cannot ask "what color is behind me".** If you find yourself wanting
  `LocalSurfaceColor.current`, inventing that CompositionLocal or threading a `color`
  parameter down the tree, stop: you are working around the theme instead of setting it.
- **Children inherit content color only if they read it.** `Text` and `Icon` default to
  `LocalContentColor.current`, which is why inheritance *feels* automatic.
  `CircularProgressIndicator` does not (its default is
  `ProgressIndicatorDefaults.circularColor`, i.e. `colorScheme.primary`). A custom
  component meant to blend in should default its color parameter to
  `LocalContentColor.current`, not to a theme role.
- **`contentColorFor(color)` is an identity lookup against the scheme roles**
  (`primary -> onPrimary`, `surface -> onSurface`, …). A raw `Color(0xFFDADADA)` matches
  no role, returns `Color.Unspecified`, and falls back to `LocalContentColor.current`.
  That is why hardcoding a hex on one `Surface` forces you to hand-write `contentColor`
  there and then again at every nested surface: the pairing information never existed.

### Which tool for which scope

| Scope | Use |
|---|---|
| One container needs its own background | `Surface(color = <a scheme role>)`; `contentColor` then resolves on its own |
| A screen or subtree needs a different palette | Override the scheme: `MaterialTheme(colorScheme = MaterialTheme.colorScheme.copy(...))` |
| A named palette reused across screens | A real theme composable beside the app's other themes, wired into its theme selector |

A nested `MaterialTheme` is cheap and safe for the middle case, because its `shapes` and
`typography` parameters default to `MaterialTheme.shapes` / `MaterialTheme.typography`,
i.e. the enclosing theme's values. Only the colors change; custom typography survives.

```kotlin
MaterialTheme(
    colorScheme = MaterialTheme.colorScheme.copy(
        surface = Color(0xFFDADADA),
        onSurface = Color.Black,
    ),
) {
    Surface(Modifier.fillMaxSize()) { /* every descendant now resolves these roles */ }
}
```

Once the roles are right, screens carry no color code at all: `Surface()`, `Card()`,
`Text`, `Icon` and `Scaffold`'s `containerColor` all read them from the scheme.

### Building a full alternate palette

Set **every** role explicitly. Anything left to `lightColorScheme()` /
`darkColorScheme()` defaults pulls in the tinted M3 baseline tokens, which surfaces later
as stray purple in a palette that was supposed to be hueless or brand-specific. When the
palette derives from only a few source colors, write one mapper rather than two
near-identical 37-line blocks:

```kotlin
private fun Palette.toColorScheme() = ColorScheme(
    background = ground, onBackground = content,
    surface = ground, onSurface = content,
    surfaceContainerLowest = raised, ...
)
private val LightColors = Palette.Light.toColorScheme()
private val DarkColors = Palette.Dark.toColorScheme()
```

Check the roles a restricted palette flattens before shipping it: collapsing `error` into
the normal content color makes error states invisible, and `outlineVariant` doubles as the
default `HorizontalDivider` color.

### Tonal elevation repaints the color you declared

`Surface(color = …)` does not always paint that color. Before drawing, it runs
`applyTonalElevation`, which swaps in `surfaceTint` composited over `surface` whenever two
things hold: the color **equals** `colorScheme.surface`, and the accumulated
`LocalAbsoluteTonalElevation` is non-zero.

```kotlin
if (backgroundColor == surface && LocalTonalElevationEnabled.current)
    surfaceTint.copy(alpha = ((4.5f * ln(elevation.value + 1)) + 2f) / 100f).compositeOver(surface)
```

Two traps follow from the comparison being on *value*, not role. A flattened palette where
`background`, `surface` and `surfaceContainerHigh` all hold the same gray puts every one of
them on this path. And elevation accumulates down the tree, so a Surface that declares no
elevation still inherits whatever a dialog, sheet, menu, FAB or snackbar ancestor added —
Level 3 is 6dp, which over `#DADADA` with a black `surfaceTint` lands on exactly `#C3C3C3`.
A palette that is supposed to be flat therefore needs the tint switched off explicitly:

```kotlin
surfaceTint = ground,   // a tint equal to the surface makes the overlay a no-op
...
CompositionLocalProvider(LocalTonalElevationEnabled provides false) { MaterialTheme(...) }
```

`surfaceTint = Color.Transparent` does **not** disable it — the overlay calls
`surfaceTint.copy(alpha = …)`, which turns transparent black back into black at that alpha.
Set the tint to the surface color, or turn the local off, or both (the local doesn't cover
direct `colorScheme.surfaceColorAtElevation(…)` calls).

When a rendered color disagrees with the one in the source, sample the pixels rather than
re-reading the call site: a probe strip of the same role painted by `Modifier.background`,
by a plain `Surface`, and by a `Surface(tonalElevation = 6.dp)` separates a theme bug from
an anti-aliased pixel in one render.

### The smell

A literal `Color(0xFF…)` in a screen body. It means the value is not in the `ColorScheme`,
so nothing can resolve it automatically and every descendant has to be told by hand.

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
