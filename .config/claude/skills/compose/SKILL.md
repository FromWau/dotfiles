---
name: compose
description: Compose UI layer — how to build and structure Jetpack Compose / Compose-Multiplatform UI. State retention (`remember`/`rememberSaveable`/`retain`), stateless composables + state hoisting, the `state` + `onAction` contract, focus/keyboard, performance, pagination, device-adaptive sizing (the Size-object pattern), and UX best practices (`references/compose-deep-dive.md`). Also the experimental Compose **Styles API** (`references/compose-styles-api.md`): reusable state-driven visual styling via `Style`/`Modifier.styleable`, why it complements rather than replaces modifiers, and custom-design-system theming — load it for any "what is the Styles API", "Style vs Modifier", `styleable`, or "build a custom design system" question. Also the **UiText** pattern for turning typed errors into display strings without a `Context`. Load whenever building, theming, or reviewing Compose UI — `@Composable` functions, `remember`/`rememberSaveable`, state hoisting, adaptive/responsive layouts, `WindowSizeClass`, Styles — even when the user doesn't name the skill. Pair with `mvi` (the ViewModel side that drives the UI), `kotlin` (language idioms), `software-design` (architecture), `uiux-design` (visual/UX principles), and `styles` (step-by-step Styles migration). For the presentation architecture itself — MVI, ViewModel scoping, Koin DI — load `mvi`, not this.
---

# Compose UI

The **UI-rendering tier**: how to build, structure, and theme Compose UI (Android and Compose Multiplatform both). It is the *view* — the ViewModel/state machine that drives it lives in **`mvi`**. Companions to load alongside this one when the work reaches into them:
- **`mvi`** — the presentation architecture that produces the `state` and consumes the `onAction` this UI is bound to (MVI, ViewModel, Koin DI, events).
- **`kotlin`** — Kotlin-language idioms: coroutines/flows, `Result<D, E>`, `inline`/`value class`, formatting.
- **`software-design`** — language-agnostic architecture: layering, when to abstract, composition over inheritance.
- **`uiux-design`** — visual and product-UX *principles* (hierarchy, spacing, color, states). This skill is the framework mechanics; `uiux-design` is the design judgement.
- **`styles`** — the step-by-step recipe for migrating a component to the Styles API.

## When to read references

- **`references/compose-deep-dive.md`** — state retention (`remember`/`retain`/`rememberSaveable`), UI state modeling, focus/keyboard, performance, stateful vs stateless, pagination, adaptive sizing (the Size-object pattern for device-adaptive screens), UX best practices. Read when building Compose UIs or making layouts adapt to device classes.
- **`references/compose-styles-api.md`** — the experimental Compose **Styles API** (`androidx.compose.foundation.style`): why it exists (bundle reusable visual attributes, last-wins instead of additive, declarative pressed/hovered/focused/disabled states with automatic animation, inheritance + `.then` hierarchy), why it sits *alongside* modifiers rather than replacing them (Style is visual-only; Modifier is the behavior/layout superset), and design-system patterns (base+variant styles, `style` parameter defaulting to empty `Style`, theme-token access via `StyleScope` extensions). Read when building or theming a custom design system, deciding Style vs Modifier, or asked "what is the Styles API / `Modifier.styleable`". For the step-by-step migration recipe, load the companion **`styles`** skill.

## Composables are stateless

- **Never inject services or repositories into composables** — composables receive only `state` and an `onAction: (Action) -> Unit` lambda. All side effects (navigation, API calls, DB writes, service calls) go through `onAction` → ViewModel. Pass a single `onAction` lambda rather than many individual callbacks. The ViewModel is the only place that holds dependencies and orchestrates work — that side lives in **`mvi`**.

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
