---
name: kotlin-formatting
description: Use when editing, writing, or reviewing Kotlin files (`.kt`, `.kts`) — formatting conventions for parameter lists, Compose composables, lambdas, when-expressions, data classes, enums, chained calls, and the no-unicode-escapes rule for string literals. Apply whenever generating or modifying Kotlin code, even for trivial edits, since these conventions are not enforced by ktlint/detekt defaults.
---

# Kotlin Formatting & Linting

## General Rules
- **Trailing commas** — always add trailing commas on the last parameter, enum entry, and collection element
- **Line length** — break lines at ~120 characters
- **Blank lines** — one blank line between functions, between logical sections within a function
- **Never use semicolons** — never put multiple statements on one line with `;`. Each statement gets its own line

## Function Parameters
- **1 param** — can stay on one line if short: `fun foo(bar: String): Int`
- **2+ params** — each on its own line:
```kotlin
fun createEntity(
    name: String,
    path: Path,
    cover: Path? = null,
): ArtistEntity
```

## Compose Composables
- **Each parameter on its own line** when there are 2+ params:
```kotlin
Text(
    text = candidate.title.value,
    style = MaterialTheme.typography.titleSmall,
    modifier = Modifier.weight(1f),
    maxLines = 1,
    overflow = TextOverflow.Ellipsis,
)
```

- **Never inline composable content** — always break Row/Column content across lines:
```kotlin
// WRONG
Row(verticalAlignment = Alignment.CenterVertically) { Text("Label"); Spacer(Modifier.width(6.dp)); Text(value) }

// RIGHT
Row(
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(6.dp),
) {
    Text(
        text = "Label",
        style = MaterialTheme.typography.labelSmall,
    )

    Text(
        text = value,
        style = MaterialTheme.typography.bodySmall,
    )
}
```

- **Use `Arrangement.spacedBy()`** instead of manual `Spacer` between sibling elements in Row/Column
- **Blank lines between logical blocks** inside Column/Row content (e.g., between a title row and a meta row)

## Data Classes & Enums
```kotlin
// Trailing comma on last field
data class MediaEntity(
    val id: Uuid,
    val name: String,
    val path: String,
)

// Trailing comma on last entry
enum class MediaType {
    AUDIO,
    VIDEO,
}
```

## When Expressions
- Short branches can stay on one line
- Long branches get their own block:
```kotlin
val view = when (action) {
    Action.OnOverviewClicked -> Tab.Overview
    Action.OnNewClicked -> Tab.New
    Action.OnMissingClicked -> Tab.Missing
}
```

## Lambda Formatting
- **Short lambdas** — one line: `items.map { it.toDomain() }`
- **Multi-statement lambdas** — braces on their own lines:
```kotlin
_state.update { old ->
    old.copy(
        candidates = old.candidates.map { c ->
            if (c.path == path) transform(c) else c
        }.toImmutableList(),
    )
}
```

## No Unicode Escapes in Code
- **Never use unicode escape sequences** (`→`, `▶`, `—`, etc.) in string literals
- Use plain text for labels: `"Artist"` not `"→ Artist"`
- If you need icons/symbols in UI, use actual Compose `Icon()` components, not unicode characters in strings
- Separators should be plain characters: `" - "` not `"—"`

## Chained Calls
- Break after each `.` when the chain is long:
```kotlin
triageRepository
    .getCandidatesByReason(CandidateReason.NEW)
    .collect { result ->
        result.onSuccess { candidates ->
            // ...
        }
    }
```
