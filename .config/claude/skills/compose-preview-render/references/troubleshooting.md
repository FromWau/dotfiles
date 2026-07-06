# Troubleshooting headless preview rendering

Error-message → cause → fix, from real debugging sessions. Also explains the
non-obvious design constraints of the init script.

## Why the init script is shaped this way

- **Plugin on the ROOT buildscript classpath, not the initscript classpath.**
  The screenshot plugin references AGP classes. Classes loaded via
  `initscript { dependencies { classpath ... } }` live in a classloader that
  cannot see AGP (which is in the project's plugin classloader), producing
  `NoClassDefFoundError: com/android/build/api/artifact/Artifacts` at apply
  time. Injecting via `projectsLoaded { rootProject { buildscript { ... } } }`
  puts the plugin next to AGP in the loader hierarchy.
- **No plugin classes referenced by name in the init script.** The init script
  itself compiles before the buildscript classpath exists, so tasks are matched
  by name (`update*ScreenshotTest`) and properties set dynamically
  (`t.testEngineInput.referenceImageDir`) — Groovy's dynamic dispatch resolves
  them at execution time.
- **`referenceImageDir` redirect.** By default the plugin writes reference
  images into `src/screenshotTest{Variant}/reference/` INSIDE the repo. The
  redirect via `testEngineInput.referenceImageDir` is what keeps the repo
  clean. `PreviewScreenshotUpdateTask` extends Gradle's `Test` task; the
  engine's inputs (incl. `previewImageOutputDir`, `threshold`, `namespace`,
  `resourceApkFile`) hang off `getTestEngineInput()`.

## Error → fix table

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to apply plugin ... NoClassDefFoundError: com/android/build/api/...` | Plugin on initscript classpath | Already handled by the bundled script (root buildscript injection). If you rewrote the script, restore that structure. |
| `Please enable screenshotTest source set in module first` | Module-level `experimentalProperties["android.experimental.enableScreenshotTest"]` missing | The init script sets it; it must run before the plugin applies. |
| Build ignores the whole feature / source set missing | `-Pandroid.experimental.enableScreenshotTest=true` not passed on the command line | Both the -P property AND the module experimental property are required. The wrapper passes -P always. |
| `Unresolved reference 'PreviewTest'` or `Unresolved reference 'android'` on the import | `screenshot-validation-api` not on the fixture classpath | Init script adds it; version must match `PREVIEW_PLUGIN_VERSION`. |
| Unresolved references to theme/util classes in fixtures | Fixture classpath is independent of the module's `implementation` deps | Add them via `PREVIEW_DEPS` (`project:` prefix for modules). |
| `Could not resolve com.android.tools.screenshot:...` | Project locks repositories (`dependencyResolutionManagement`) without google() | The plugin's own renderer deps resolve from PROJECT repositories. Ensure google() + mavenCentral() are among them (they nearly always are for Android projects). |
| Renderer/toolchain JVM errors | JDK < 17 | Set `JAVA_HOME` to a JDK 17+ (Android Studio's JBR works: `/opt/android-studio/jbr`). |
| Task `update<Variant>ScreenshotTest` not found | Wrong variant capitalization or module has flavors | Task is `update{VariantName}ScreenshotTest`, e.g. `updateDemoDebugScreenshotTest` for flavor `demo`. List with `./gradlew :module:tasks --all | grep -i screenshot`. |
| PNGs missing for a new fixture, build green | Function not annotated `@PreviewTest`, or not `@Composable`+`@Preview` | All three annotations required; multipreview annotations count as `@Preview`. |
| Output PNGs unchanged after a code edit | Update task diffs against existing images and skips identical writes | Not staleness — the render DID happen. Delete the output dir if you need proof-of-render, or trust it: real changes always rewrite. |
| Renderer crash / `Render Errors` on first run after big changes | Transient layoutlib/classloader hiccup | Simply rerun once before deeper debugging. |

## Behavioral notes

- **Output naming**: `<FunctionName>_<previewName>_<paramsHash>_<index>.png`
  under `<package>/<FileKt>/`. Multipreview bundles produce one file per
  device spec; the unnamed one is the annotation without a `name` attribute.
- **Indeterminate progress indicators** render at animation time zero (a tiny
  stroke-cap dot, not an arc). Not a bug.
- **Preview wrapper scaffolds** (project preview containers that draw
  HEADER/BODY placeholders) show through transparent content — recognize them
  before reporting phantom UI elements.
- **Concurrency**: don't run two Gradle builds on the same project in
  parallel (daemon/file-lock contention). Render batches in one run instead —
  put many fixtures in the dir and let one task render them all.
- **Cost**: first run downloads the plugin + layoutlib runtime (~100MB) and
  does a full module build; subsequent runs are incremental (tens of seconds
  to ~2 min on large modules).
- **Plugin maturity**: the plugin is experimental (0.0.1-alphaNN). On version
  bumps, re-check the task-property names used by the redirect
  (`testEngineInput.referenceImageDir`) — they are internal API.

## Relationship to Android Studio's render API

`android studio render-compose-preview` (Android CLI) can render previews via
a running Studio, but: it needs Studio Quail 2+, Gemini enabled and signed in,
renders only ONE config per multipreview, and serves classes from the IDE's
last-build snapshot — external Gradle builds don't refresh it, making
edit-render loops silently stale. This Gradle path has none of those issues
and should be preferred for iterative work.
