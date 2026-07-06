---
name: compose-preview-render
description: Render Jetpack Compose @Preview composables headlessly to PNG files from the CLI — no Android Studio, no Gemini, no emulator, and zero repo changes — by injecting the AGP screenshot-test plugin via a Gradle init script. Use whenever you need to actually SEE what a composable looks like — verifying a UI change visually, checking adaptive layouts / text clipping / error states across device sizes, "render the preview", "show me a screenshot of this composable", "check how this looks on device X" — in any Gradle-based Kotlin project (Android or KMP with an Android target), including when Studio's render-compose-preview is unavailable or serving stale classes. Do NOT use for driving a live running app (kmp-ui-harness), OS-level screenshots, or authoring a project's own committed screenshot-test suite.
---

# Headless Compose Preview Rendering

Renders `@Preview` composables to PNGs via `./gradlew` using Google's Compose
Preview Screenshot Testing plugin — but injected through an init script, so the
target repository is **never modified**: no plugin wiring, no `screenshotTest`
folder, no committed reference images. Every run re-renders from freshly
compiled code (unlike Android Studio's render API, which caches classes until
an IDE build and requires Gemini enabled).

## When this works

- Module is an Android library or application (`com.android.library` /
  `com.android.application`), including KMP modules **with an Android target**.
- AGP >= 8.5, Kotlin >= 1.9.20, JDK 17+, Compose enabled in the module.
- Pure desktop/CMP modules (no Android target): this path does not work —
  layoutlib only renders Android. Say so, and offer alternatives: render via a
  sibling Android target, use Roborazzi/Paparazzi, or drive the live app
  (kmp-ui-harness skill).

## Workflow

### 1. Preflight (once per project)

- Find the Gradle root (where `gradlew` lives — not always the repo root).
- Check AGP and Kotlin versions (version catalog or root build script).
- Identify the target module and its namespace (`android { namespace = ... }`).
- Pick a per-project harness dir for fixtures, e.g.
  `~/.local/share/<project>-preview-render/fixtures/`. Check whether one
  already exists from a previous session before creating it.

### 2. Write fixture composables

Fixtures live OUTSIDE the repo in the fixtures dir. They compile as part of
the module's `screenshotTest` source set, so they can use the module's public
and internal API, but NOT private members — replicate private preview helpers
instead of calling them.

```kotlin
package com.example.feature   // module namespace, or any package

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.android.tools.screenshot.PreviewTest

@PreviewTest                                  // required for discovery
@Preview(device = "spec:width=411dp,height=891dp")
@Composable
private fun CheckoutScreen_Empty() {
    AppTheme {                                // wrap in the project's theme
        CheckoutScreen(state = CheckoutState.Empty, onAction = {})
    }
}
```

- `@PreviewTest` comes from `com.android.tools.screenshot:screenshot-validation-api`
  (the init script adds it to the classpath automatically).
- Multipreview annotations (project-defined bundles of `@Preview`) expand to
  one PNG per device spec — the best way to cover a device matrix in one run.
- Fixtures define the exact states to inspect (error states, long text,
  edge-case data) — this is where the value is; be deliberate.

### 3. Render

```bash
PREVIEW_MODULE=":feature:checkout" \
PREVIEW_FIXTURES="$HOME/.local/share/myproject-preview-render/fixtures" \
PREVIEW_PROJECT_DIR="/path/to/gradle-root" \
PREVIEW_BOM="androidx.compose:compose-bom:<version from the project>" \
PREVIEW_DEPS="project::core:designsystem" \
<skill-dir>/scripts/render-previews
```

PNGs land in `/tmp/compose-previews/<package>/<FileKt>/<Function>_<device>_<hash>.png`.
Read them with the Read tool and evaluate.

Env knobs (full contract in the script headers): `PREVIEW_VARIANT` (default
`Debug`), `PREVIEW_OUT`, `PREVIEW_PLUGIN_VERSION` (default `0.0.1-alpha15`).

Classpath rules for fixtures:
- The fixture classpath is separate from the module's — dependencies the
  fixtures need (theme module, immutable collections, etc.) must be passed via
  `PREVIEW_DEPS` (comma-separated; `project:` prefix for project modules).
- Pass `PREVIEW_BOM` when the project uses the Compose BOM; it also pulls in
  `ui-tooling`. Without a BOM, include a versioned
  `androidx.compose.ui:ui-tooling:<version>` in `PREVIEW_DEPS`.

### 4. Iterate

Edit production code or fixtures → rerun the script → re-read the PNGs. Every
run recompiles changed sources; there is no stale-cache failure mode. Renders
that produce identical images are not rewritten (mtime stays old) — when in
doubt whether a change took, delete the output dir first.

### 5. Leave no trace

The repo must stay untouched throughout — verify with `git status` at the end.
Fixtures and output are external by construction. Never move fixtures into the
repo or commit plugin wiring unless the user explicitly asks for real
screenshot testing (that's the plugin's committed setup, a different task).

## KMP notes

KMP library modules with an Android target use the same flow; the plugin hooks
the Android variant. If fixture sources aren't picked up, the KMP source-set
wiring may differ (try `kotlin.sourceSets["androidScreenshotTest"]` in the init
script's source-set block) — verify on first use per project and prefer fixing
the init script over touching the repo.

## Failure modes

Most errors are one of five known cases (wrong classloader, missing flags,
missing fixture deps, JDK mismatch, repository lockdown). Read
[references/troubleshooting.md](references/troubleshooting.md) before
debugging from scratch — it maps each error message to its fix and documents
why the init script is shaped the way it is.
