# Compose Styles API — reusable, state-driven visual styling

The **Styles API** (`androidx.compose.foundation.style`, experimental) is a new way
to express a composable's *visual* attributes as a reusable object instead of a
chain of modifiers. This file is the **why / when / alongside-not-instead** framing
plus the design-system patterns. For the mechanical migration workflow (upgrade
deps, opt in, move a component onto `Modifier.styleable` step by step) load the
**`styles`** skill — it carries Google's official migration recipe and exact
`StyleScope` function inventory, and this file does not repeat it.

Status: experimental, opt-in. Needs `compileSdk` 37+, foundation `1.12.0-alpha01`+
(or Compose BOM `2026.04.01`+), the annotation `@ExperimentalFoundationStyleApi`,
and the compiler flag `-opt-in=androidx.compose.foundation.style.ExperimentalFoundationStyleApi`.
The API is likely to shift, so pin the pattern (below), not any single symbol.

## Why it exists — what modifiers can't do cleanly

Modifiers style **one property at a time**, are **additive**, and are
**order-dependent**. Building a custom design system on top of them means
copy-pasting property chains and reasoning about layering order at every call
site. Material 3 also pushes you toward its own theming conventions, so a bespoke
look means working *around* the theme. Styles target four specific gaps:

- **Bundle a reusable set of visual attributes into one named thing.** "Our
  primary button look" (background + corner radius + padding + content color +
  font) becomes a single `Style` you apply in one line, not a chain you clone.
- **Last-wins instead of additive.** Setting `background()` twice yields one final
  value; independent properties don't care about order. Modifiers layer
  everything (`.background(green).background(yellow)` draws both) and reordering
  `clickable` / `padding` / `background` silently changes the result.
- **Declarative interaction states with automatic animation.** `pressed { }`,
  `hovered { }`, `focused { }`, `disabled { }` blocks describe the look per state;
  an `animate { }` block transitions between them without hand-wiring
  `animateColorAsState`.
- **Inheritance and hierarchy.** A style set on a parent reaches child composables
  (CSS-like: a `Box` style flows into the `BasicText` inside), and styles compose
  into a base-plus-variant hierarchy via `.then`.

There is also a performance angle: styles resolve in the **Layout and Draw phases
and skip Composition**, so state-driven visuals recompose less than the modifier
equivalent.

## Style is visual-only — use it alongside Modifier, not instead

Modifiers are **not** deprecated and this is **not** a drop-in replacement. The
relationship is strictly asymmetric:

- **Modifier is the superset** — behavior (`clickable`, pointer input), layout
  participation, semantics/accessibility, measured size. A style can never make
  something clickable or observe events.
- **Style covers the visual subset** — background, shape, border, padding, font
  size/weight, text align, content color, drop shadow — more conveniently,
  especially when that set is reusable or state-dependent.
- `Modifier.styleable(...)` is **itself a modifier**, so the two compose in the
  same chain rather than competing.

```kotlin
Box(
    modifier
        .clickable(onClick = onClick, interactionSource = interactionSource, indication = ripple())
        .styleable(styleState, AppStyles.filledButton, style)   // visual bundle plugged in here
)
```

Mental model: **Modifier for behavior + layout, Style for the reusable visual look
and its interaction states.** When several styles target the same property,
precedence runs weakest to strongest: inherited parent style < the `styleable`
modifier's style < a component's `style` parameter < a directly-set property (an
explicit `Modifier.background` or `BasicText(fontSize = …)` still overrides
everything).

Scope caveat: the `styles` skill supports **custom components and themes**, not
Material 3 component styling. Some M3 components now expose a `style = { }` lambda;
for those that don't, hook in via `Modifier.styleable`.

## Defining and applying a style

```kotlin
val filledButton = Style {
    background(AppColors.brand)         // StyleScope functions, not modifiers
    shape(RoundedCornerShape(12.dp))
    contentPadding(16.dp)
    fontSize(18.sp)
    textAlign(TextAlign.Center)
    contentColor(Color.White)           // drawn on top of the surface (text, icons)
}
```

Apply it through the modifier (`Modifier.styleable(styleState, vararg styles)`),
through a component's own `style` parameter, or through an M3 component's
`style = { }` lambda. `styleable` takes the state first, then one or more styles
combined left-to-right (last wins).

`contentColor` is respected by `BasicText` but not necessarily by Material `Text`.
The presenter also had to opt into an experimental `ComposeFoundationFlags` toggle
(he names it `isInheritedTextStyleEnabled`) for a parent style's text properties to
reach a nested `BasicText`. Treat that exact flag name as presenter-stated: the
`ComposeFoundationFlags.is…Enabled` family is real (`isSmartSelectionEnabled`,
`isBasicTextFieldMinSizeOptimizationEnabled`), but this member was not confirmed in
the public reference at capture time.

## Interaction states and animation

An interactive component needs a `StyleState` so the style knows when it is
pressed / hovered / focused / disabled. Link it to the same `InteractionSource`
the `clickable` writes to, and copy component parameters (like `enabled`) into it.
Prefer `rememberUpdatedStyleState` over a hand-rolled `LaunchedEffect` that pokes a
`MutableStyleState` — it keeps the copied fields in sync safely:

```kotlin
val interactionSource = remember { MutableInteractionSource() }
val styleState = rememberUpdatedStyleState(interactionSource) {
    it.isEnabled = enabled
}
```

State blocks read from that state and may be nested (`focused { pressed { … } }`).
Wrap changes in `animate { }` (optionally `animate(tween(1_000)) { }`) to transition
automatically:

```kotlin
val buttonStyle = Style {
    background(AppColors.brand)
    pressed {
        animate(tween(200)) {
            background(Color.Blue)
            contentColor(Color.White)
        }
    }
    disabled {
        background(Color.Gray)
        contentColor(Color.White)
    }
}
```

## Design-system patterns — the durable part

- **Base + variants via `.then`.** Put shared attributes in a `private val
  baseButton = Style { … }`, then derive `filledButton = baseButton.then(Style {
  … })` and `outlinedButton = baseButton.then(Style { … })`. This is composition
  over duplication — the same instinct as compose-don't-inherit in
  `software-design`, applied to visual style.
- **Collect component styles in a theme object.** A singleton (`object AppStyles`
  or a `styles` handle on the theme) holds `filledButton`, `outlinedButton`,
  `card`, etc., so screens apply `AppStyles.filledButton` rather than redefining
  looks inline.
- **A component's `style` parameter defaults to the empty `Style` and is applied
  last.** Default it to the bare `Style` (not a filled default like
  `FilledButtonDefaults`), and chain the component's own style first, the incoming
  one last, so the caller can override:
  ```kotlin
  @Composable
  fun MyButton(
      onClick: () -> Unit,
      modifier: Modifier = Modifier,
      style: Style = Style,          // empty, so it contributes nothing when unused
      enabled: Boolean = true,
  ) {
      // …
      Box(modifier.styleable(styleState, AppStyles.filledButton, style)) { /* … */ }
  }
  ```
  Because last-wins, putting the caller's `style` after the component's own lets a
  call site tweak one property (e.g. `contentColor`) without redefining the look.
  Reverse the order and the component's defaults would clobber the caller.
- **Reach theme tokens through a `StyleScope` extension property, using
  `currentValue`.** A `Style { }` block is not a composable, so `LocalX.current`
  won't recompose it. Expose tokens as extensions that read `.currentValue`:
  ```kotlin
  val StyleScope.colors: AppColors
      get() = LocalAppColors.currentValue
  // then inside any Style: background(colors.brand)
  ```
  Provide the right token set (light/dark) with a `CompositionLocalProvider` at the
  theme root, as you would for any custom design-system color object.

---

Distilled from a Jetpack Compose Styles API video walkthrough (custom design-system
button example) and cross-checked against Google's `styles` skill and the official
Compose Styles docs (`developer.android.com/develop/ui/compose/styles`). Symbol and
package names (`Modifier.styleable`, `Style`, `StyleScope`, `MutableStyleState`,
`rememberUpdatedStyleState`, `@ExperimentalFoundationStyleApi`, `androidx.compose.foundation.style`)
verified against those sources; the `isInheritedTextStyleEnabled` flag is
presenter-stated and unconfirmed in the public reference. API treated as of mid-2026
and experimental, so favor the patterns over exact signatures. For the step-by-step
migration recipe, load the **`styles`** skill.
