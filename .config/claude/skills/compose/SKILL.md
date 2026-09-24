---
name: compose
description: Compose UI layer — how to build and structure Jetpack Compose / Compose-Multiplatform UI. State retention (`remember`/`rememberSaveable`/`retain`), stateless composables + state hoisting, the `state` + `onAction` contract, focus/keyboard, performance, pagination, device-adaptive sizing (the Size-object pattern), UX best practices, and **theming/color inheritance** (`references/compose-deep-dive.md`): why `Surface` propagates `LocalContentColor` but never its background, when to override the `ColorScheme` with a nested `MaterialTheme` instead, and how to build a full alternate palette. Load it for any `MaterialTheme`/`ColorScheme`/`colorScheme.copy`/`Surface`/`contentColor`/`LocalContentColor`/`contentColorFor`, `surfaceTint` or `tonalElevation` question, when a rendered color does not match the one declared in the scheme, or when a screen hardcodes a `Color(0xFF…)`. Also the experimental Compose **Styles API** (`references/compose-styles-api.md`): reusable state-driven visual styling via `Style`/`Modifier.styleable`, why it complements rather than replaces modifiers, and custom-design-system theming — load it for any "what is the Styles API", "Style vs Modifier", `styleable`, or "build a custom design system" question. Also the **UiText** pattern for turning typed errors into display strings without a `Context`. Load whenever building, theming, or reviewing Compose UI — `@Composable` functions, `@Immutable`/`@Stable` stability questions, `@Preview`/`@PreviewParameter`, `remember`/`rememberSaveable`, state hoisting, adaptive/responsive layouts, `WindowSizeClass`, Styles — even when the user doesn't name the skill. Pair with `mvi` (the ViewModel side that drives the UI), `kotlin` (language idioms), `software-design` (architecture), `uiux-design` (visual/UX principles), and `styles` (step-by-step Styles migration). For the presentation architecture itself — MVI, ViewModel scoping, Koin DI — load `mvi`, not this.
---

# Compose UI

The **UI-rendering tier**: how to build, structure, and theme Compose UI (Android and Compose Multiplatform both). It is the *view* — the ViewModel/state machine that drives it lives in **`mvi`**. Companions to load alongside this one when the work reaches into them:
- **`mvi`** — the presentation architecture that produces the `state` and consumes the `onAction` this UI is bound to (MVI, ViewModel, Koin DI, events).
- **`kotlin`** — Kotlin-language idioms: coroutines/flows, `Result<D, E>`, `inline`/`value class`, formatting.
- **`software-design`** — language-agnostic architecture: layering, when to abstract, composition over inheritance.
- **`uiux-design`** — visual and product-UX *principles* (hierarchy, spacing, color, states). This skill is the framework mechanics; `uiux-design` is the design judgement.
- **`styles`** — the step-by-step recipe for migrating a component to the Styles API.

## When to read references

- **`references/compose-deep-dive.md`** — state retention (`remember`/`retain`/`rememberSaveable`), UI state modeling (incl. how `@Immutable` is inherited through sealed hierarchies), focus/keyboard, performance, stateful vs stateless, previews (`@PreviewParameter` providers vs named preview functions), pagination, adaptive sizing (the Size-object pattern for device-adaptive screens), theming & color inheritance (`Surface` vs a nested `MaterialTheme`, building an alternate `ColorScheme`), UX best practices. Read when building Compose UIs, making layouts adapt to device classes, or changing what colors a screen uses.
- **`references/compose-styles-api.md`** — the experimental Compose **Styles API** (`androidx.compose.foundation.style`): why it exists (bundle reusable visual attributes, last-wins instead of additive, declarative pressed/hovered/focused/disabled states with automatic animation, inheritance + `.then` hierarchy), why it sits *alongside* modifiers rather than replacing them (Style is visual-only; Modifier is the behavior/layout superset), and design-system patterns (base+variant styles, `style` parameter defaulting to empty `Style`, theme-token access via `StyleScope` extensions). Read when building or theming a custom design system, deciding Style vs Modifier, or asked "what is the Styles API / `Modifier.styleable`". For the step-by-step migration recipe, load the companion **`styles`** skill.

## Composables are stateless

- **Never inject services or repositories into composables** — composables receive only `state` and an `onAction: (Action) -> Unit` lambda. All side effects (navigation, API calls, DB writes, service calls) go through `onAction` → ViewModel. Pass a single `onAction` lambda rather than many individual callbacks. The ViewModel is the only place that holds dependencies and orchestrates work — that side lives in **`mvi`**.

## Theming: set the scheme, don't paint the color

`Surface` provides `LocalContentColor` to its children and nothing else. It never
propagates its own background, and there is no `LocalSurfaceColor` to read. So when a
child needs a different background, reach for the right scope instead of passing colors
around:

- one container, a different background → `Surface(color = <a scheme role>)`
- a screen or subtree, a different palette → `MaterialTheme(colorScheme = MaterialTheme.colorScheme.copy(...))`, which inherits the enclosing typography and shapes
- a named palette used by several screens → its own theme composable

Wanting to invent a `LocalSurfaceColor`, or threading a `color` parameter down the tree,
means the value belongs in the `ColorScheme` and isn't there yet. A literal
`Color(0xFF…)` in a screen body is the tell: it matches no role, so `contentColorFor`
can't pair it and every descendant has to be told by hand.

Expect the scheme to be honoured, but verify it: `Surface` silently replaces a color that
equals `colorScheme.surface` with `surfaceTint` over it once any ancestor contributes tonal
elevation, so a flat palette has to set `surfaceTint` to its own surface color and provide
`LocalTonalElevationEnabled provides false`. That, plus how to build a full alternate
palette without leaking the tinted M3 baseline tokens, is in
`references/compose-deep-dive.md`.

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
