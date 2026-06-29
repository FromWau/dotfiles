---
name: kmp-ui-harness
description: >
  Operate and test a RUNNING Compose Multiplatform app by driving its live UI in-process — dump the
  UI layout as JSON, tap / long-press / set-text / scroll at coordinates, and screenshot — over a
  localhost control server (desktop, and the app's own Android build via adb forward). Use this skill
  whenever the user wants you to actually exercise or inspect a running Compose / KMP app instead of
  just reasoning about it: walk through / drive / operate the app, click or tap a button, dump the UI
  layout, screenshot the app window, scroll a list and read it back, type into a field, verify a
  screen by operating it, or reproduce a UI bug by clicking through it — even when they don't name the
  harness. Also use it whenever the user wants to ADD this UI-driving harness to a KMP project, and
  prefer it over writing unit tests when the goal is to exercise the real app. Do NOT use it for
  Compose unit or snapshot tests (createComposeRule, Paparazzi/Roborazzi), OS-level screenshots
  (grim/scrot/screencapture), driving third-party apps via adb/uiautomator, web automation
  (Playwright/Selenium), authoring accessibility labels, packaging or release builds, or
  backend/integration tests — those do not use this harness.
---

# KMP UI Harness

A debug-only, release-stripped in-process harness. In debug builds it wraps the app's root
composable and starts a localhost HTTP control server (`127.0.0.1:6699`) you drive with `curl`.
Input AND screenshots are fully in-process (no external tools): Compose **semantics actions** for
input (works under Wayland/XWayland, where `java.awt.Robot` does NOT — its capture is black and
absolute clicks miss) and Skiko `SkiaLayer.screenshot()` for pixels (replays the last rendered
frame, so it captures the app window specifically on any OS/compositor).

## Control API (`127.0.0.1:6699`)

- `GET  /layout`     → `{"owners":[<UiNode tree>]}`; each node has `role,text,testTag,bounds{x,y,width,height},actions,scrollAxes,editableText,toggle,selected,enabled,children`. Coords are window-content px. `scrollAxes` lists `"vertical"`/`"horizontal"` (scrollable nodes also carry `"ScrollBy"` in `actions`). `editableText` = a field's current value; `toggle` = `On|Off|Indeterminate` for checkboxes/switches; `selected`/`enabled` when present — so field values and checkbox state are verifiable headlessly, no screenshot needed.
- `POST /tap`        → body `"x,y"` → invokes the smallest `OnClick` node containing (x,y). Reply `ok`|`miss`.
- `POST /longPress`  → body `"x,y"` → `OnLongClick`.
- `POST /setText`    → body `"x,y,text"` → `SetText` on the field at (x,y).
- `POST /tapLabel`   → body `"<label>"` → clicks the smallest `OnClick` node whose label (its text, else its contentDescription; case-insensitive substring) contains `<label>`. Prefer this over `/tap` for buttons with a stable label, especially icon-only ones (play/pause, an overflow `⋮`): it hit-tests in-process so it never depends on window size / DPI, no coordinate math. Reply `ok`|`miss`.
- `POST /longPressLabel` → body `"<label>"` → `OnLongClick` the smallest node whose label matches.
- `POST /setTextLabel`   → body `"<label>,<text>"` → `SetText` on the smallest field whose label/placeholder matches `<label>` (split on the first comma; `<text>` may contain commas).
- `POST /scroll`     → body `"dx,dy"` scrolls the largest scrollable supporting the axis; `"x,y,dx,dy"` scrolls the smallest scrollable under (x,y). `+dx`→right, `-dx`→left, `+dy`→down, `-dy`→up. Use the 4-arg form to target a horizontal row nested in a vertical list (find it via `scrollAxes` in `/layout`).
- `GET  /screenshot` → PNG of the active Compose window, rendered in-process via Skiko (`SkiaLayer.screenshot()`). No external tool; works on any OS/compositor and grabs the app window specifically.

## Cross-platform status

Control logic (layout dump, hit-test, input, scroll) is in `commonMain`, built on three `expect`
seams — `harnessSemanticsRoots()`, `harnessRunOnUiThread{}`, `harnessScreenshotPng()` — plus a
per-platform control-server transport. Adding a target = implement those.

- **Desktop (JVM)** — fully working. Seams: `ComposeWindow.semanticsOwners`, Swing EDT, `SkiaLayer.screenshot()`. Input/layout are cross-OS (Win/Mac/Linux); screenshot is in-process so no OS dependency remains.
- **Android** — wired, compile-verified (not yet device-tested). Seams: semantics root via reflection on the hosting `AndroidComposeView` (its `semanticsOwner` is internal — fragile across Compose versions), main-`Looper` dispatch, `PixelCopy`. Same ktor server (needs `INTERNET`). Drive it from the host: `adb forward tcp:6699 tcp:6699` then `curl localhost:6699/...`.
- **iOS** — partially feasible (not implemented). Screenshot via a UIKit view snapshot and the control server via `ktor-server-cio` (it supports Kotlin/Native; in the simulator `127.0.0.1` is shared with the mac host) both work. The blocker is `harnessSemanticsRoots()`: Compose iOS doesn't expose the semantics root publicly and Kotlin/Native has no JVM-style reflection to reach it. Defer until Compose exposes an API or a native-internal path is built.

## Driving an app (the loop)

1. Launch sandboxed: `./gradlew :desktopApp:runHarness` (background). Wait for the server:
   `curl -s --retry-connrefused --retry 120 --retry-delay 1 http://127.0.0.1:6699/layout`.
2. `GET /layout`, parse JSON, find the target element's bounds, compute its center `(x+w/2, y+h/2)`.
3. `POST /tap "cx,cy"`.
4. **Re-read `/layout` on the NEXT step** — navigation/state is async (onClick → flow → recompose),
   so an immediate re-read is stale; a second round-trip (or a short wait) shows the new screen.
5. Validate with app logs and (if DB-backed) `sqlite3` on the sandbox DBs, not screenshots.

A tiny layout pretty-printer helps; given `L.json`:
```python
import json,sys
d=json.load(open(sys.argv[1]))
def w(n,a):
    t=(n.get("text")or"").strip(); b=n.get("bounds")or{}
    a.append((n.get("role"),t,int(b.get("x",0)),int(b.get("y",0)),int(b.get("width",0)),int(b.get("height",0)),"OnClick"in(n.get("actions")or[]),"SetText"in(n.get("actions")or[])))
    for c in n.get("children",[]): w(c,a)
a=[]; [w(o,a) for o in d.get("owners",[])]
for r,t,x,y,ww,hh,c,s in a:
    if t or c or s: print(f"[{'C'if c else'-'}{'T'if s else'-'}] {str(r):8} '{t[:42]}' tap=({x+ww//2},{y+hh//2})")
```

## Sandbox rule (ALWAYS)

The `runHarness` task points `XDG_DATA_HOME`/`XDG_CONFIG_HOME` at `build/harness-sandbox/` so driving
never touches real user data. To seed media for a flow, COPY (never move/delete) sample files into
`/tmp/...` and set `mediaFolder` in the sandbox `app.toml` (`config/echo/app.toml`, under `[setting]`),
then relaunch. Never operate against `~/.local/share/<app>` or the user's real `~/Music`.

## Adding the harness to a KMP project

**To actually do this, use the bundled source — don't retype it.** `references/harness/` has the
complete, working source for all 16 files organized by source set (`commonMain/`, `jvmMain/`,
`androidMain/`, `nativeMain/`, plus an optional `jvmTest/`), and **`references/harness/WIRING.md`** is
the step-by-step checklist with the exact `build.gradle.kts` snippets (`GenerateBuildFlags`,
`runHarness`, `assertHarnessStripped`, ktor-server deps) and the per-project things to change
(package, release-property name, desktop main class). Copy the files in, fix the package, add the
glue. The summary below is just the mental model.

1. **Split the root composable.** Rename `App()` → `AppContent()`; add (commonMain):
   `@Composable fun App() = if (Build.DEBUG) Harness { AppContent() } else AppContent()`. Entry points
   already call `App()`, so they stay unchanged. No business-logic edits.
2. **expect/actual** (commonMain): `expect object Build { val DEBUG: Boolean }`,
   `@Composable expect fun Harness(content: @Composable () -> Unit)`, and the three control seams
   `expect fun harnessSemanticsRoots(): List<SemanticsNode>`, `expect fun <T> harnessRunOnUiThread(block: () -> T): T`,
   `expect fun harnessScreenshotPng(): ByteArray?`. Native `Build.DEBUG = false` and `Harness = content()` (no-op).
3. **Common logic** (commonMain): `toUiNode()` (semantics → `UiNode` JSON) and the input/scroll
   entrypoints (`harnessTap`/`harnessLongPress`/`harnessSetText`/`harnessScroll`/`harnessLayoutJson`),
   all expressed over the seams. `SemanticsNode`/`SemanticsActions`/`SemanticsProperties`/`boundsInWindow`
   are common Compose API, so this is fully shared. The control server (ktor) is a thin per-platform
   transport that just calls these.
4. **Generate `Build.DEBUG`** for jvm/android from a Gradle property (default `true`, `-Pecho.release=true`
   → `false`). Use an **abstract task with `Property` inputs** (a `doLast` closure capturing the script
   breaks the configuration cache).
5. **Desktop actuals** (jvmMain): roots = `ComposeWindow.semanticsOwners.map { it.rootSemanticsNode }`
   (`@OptIn(ExperimentalComposeUiApi::class)`; window via `java.awt.Window.getWindows().filterIsInstance<ComposeWindow>().firstOrNull { it.isShowing }`);
   UI thread = `SwingUtilities.invokeAndWait`; screenshot = find the `org.jetbrains.skiko.SkiaLayer`
   under the window and `.screenshot()` → `Image.makeFromBitmap(...).encodeToData(PNG).bytes`. `Harness.jvm`
   starts the ktor server. **Android actuals** (androidMain): roots via reflection on `LocalView.current`
   (`getSemanticsOwner`), main-`Looper` dispatch, `PixelCopy`; `Harness.android` captures `LocalView` then starts the server.
6. **`runHarness`** = a `JavaExec` task that sets the sandbox `XDG_*` env and runs the desktop main.
7. **Release stripping**: `Build.DEBUG` is a compile-time `const`, so the release build folds the
   wrapper to `AppContent()` and proguard/R8 removes `Harness` + ktor-server. Add a leak-check that
   fails if `ControlServer` lands in the release artifact.

## Pitfalls (learned the hard way)

- **`java.awt.Robot` does NOT work under Wayland** — screen capture is black, absolute clicks miss.
  This is why both layers are in-process: semantic-action input and `SkiaLayer.screenshot()` (replays
  the last rendered frame, immune to the black-capture). Don't reintroduce Robot or external screenshot
  tools (`grim`/`hyprctl`) — they're OS/compositor-specific and grab whatever window is focused, not the app's.
- **Android semantics access is reflection** on `AndroidComposeView.getSemanticsOwner` (internal API) —
  if a Compose bump renames it, `/layout` silently returns `{"owners":[]}`; check there before assuming the app is blank.
- **`pkill -f "<mainclass>"` matches its own command line** (the pattern string is in the pkill
  command), killing the pkill shell → silent failure. Use a regex that won't self-match, e.g.
  `pkill -9 -f 'desktop_app[.]MainKt'`.
- **Async UI** — re-read `/layout` a step later, not immediately, after a tap.
- **Configuration cache** — generate `Build.DEBUG` via an abstract `DefaultTask` with `@Input`
  properties, never a `doLast {}` that captures the build script.
- **Validate with logs + sqlite**, not screenshots; screenshots are for spot visual checks.

## Verify it works (smoke)

Launch `runHarness`; `GET /layout` should list the nav with bounds; `POST /tap` on a nav item's
center; re-`GET /layout` should show the new screen.
