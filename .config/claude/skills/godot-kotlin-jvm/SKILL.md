---
name: godot-kotlin-jvm
description: Godot Kotlin/JVM — @RegisterClass scripts, plugin/version mismatches, embedded JRE. Use for projects with com.utopia-rise.godot-kotlin-jvm plugin, .gdj files, or .kt next to project.godot.
---

# Godot Kotlin/JVM

This skill captures the practical workflow for godot-kotlin-jvm projects — the
JVM-backed Kotlin scripting layer for the Godot game engine (custom fork). The
plugin's DSL has changed across versions, the editor's "Attach Script" UI does
NOT work for `.gdj` files, and several errors look engine-related but are
actually Gradle/Kotlin-side issues. The aim of this skill is to short-circuit
all of that.

## Mental model

- The Godot **editor** is a *custom fork* of Godot built with JVM support
  (`utopia-rise/godot-kotlin-jvm`). The plain Godot binary will not load
  Kotlin code.
- The Gradle **plugin** (`com.utopia-rise.godot-kotlin-jvm`) compiles your
  Kotlin to a JAR, runs a KSP-style annotation processor, and emits `.gdj`
  registration files. The engine loads the JAR at runtime and uses `.gdj`
  files to expose your classes as Godot script types.
- The Gradle project root **is** the Godot project root — the folder
  containing `project.godot`. Don't put them in separate directories
  (unless you set `godotProjectDirectory` explicitly).
- The entry point of your code is `_ready()` (a Godot lifecycle method), not
  `main()`. `./gradlew run` doesn't apply — Godot runs your code, not Gradle.

## Plugin version selection (most common error source)

Plugin tags are `<plugin-version>-<godot-fork-version>`, e.g. `0.14.3-4.5.1`.
**Both halves matter**:

- The plugin version determines the DSL surface (and pinned Kotlin compiler).
- The Godot-fork version must match the editor binary the user is running,
  exactly. Mismatch produces the runtime error:
  `Version mismatch! C++ module is : X / Jar is : Y`.

How to find the right tag:

1. Check `project.godot` for `config/features=PackedStringArray("4.5", ...)`.
   That's the Godot version the project was created with.
2. Or the user runs `Help → About` in the editor.
3. Pick the matching plugin tag from
   <https://github.com/utopia-rise/godot-kotlin-jvm/releases>. Recent pairings:
   - Godot fork **4.6.3** → plugin `0.16.1-4.6.3` (current DSL)
   - Godot fork **4.5.1** → plugin `0.14.3-4.5.1` (older DSL — different
     property names)
   - Godot fork **4.4.1** → plugin `0.13.1-4.4.1` (older DSL)

The DSL changed between `0.14.x` and `0.16.x`. See `references/dsl-by-version.md`
for full side-by-side `build.gradle.kts` templates.

## Project layout

```
my-game/
├── project.godot                  ← Godot project file
├── godot_kotlin_configuration.json
├── scenes/*.tscn                  ← Godot scenes
├── scripts/                       ← .gdj registration files (COMMIT these)
│   └── <Pkg>/<Class>.gdj
├── src/main/kotlin/               ← your Kotlin sources
├── build/                         ← Gradle output (ignore)
├── jvm/                           ← runtime JARs + embedded JRE (ignore)
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradle/libs.versions.toml      ← single source of truth for versions
└── mise.toml                      ← optional; pins JDK 17 for devs
```

## Minimum viable build configuration

For Godot 4.5.x with mise-managed JDK 17 (machine-portable via foojay).
**Prefer a Gradle version catalog** (`gradle/libs.versions.toml`) over inline
versions — keeps everything in one place, makes upgrades trivial.

**`gradle/libs.versions.toml`**
```toml
[versions]
godot-kotlin-jvm = "0.14.3-4.5.1"
kotlinx-datetime = "0.6.2"
jdk = "17"

[libraries]
kotlinx-datetime = { module = "org.jetbrains.kotlinx:kotlinx-datetime", version.ref = "kotlinx-datetime" }

[plugins]
godot-kotlin-jvm = { id = "com.utopia-rise.godot-kotlin-jvm", version.ref = "godot-kotlin-jvm" }
```

**`settings.gradle.kts`**
```kotlin
plugins {
    // The catalog isn't available inside settings' plugins block, so foojay-resolver's
    // version stays inline. Chicken/egg: catalog is defined during settings evaluation.
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
rootProject.name = "my-game"
```

**`build.gradle.kts`** (plugin `0.14.3-4.5.1` — see references/dsl-by-version.md for 0.16.x)
```kotlin
plugins {
    alias(libs.plugins.godot.kotlin.jvm)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(libs.kotlinx.datetime)
}

val jdkVersion = libs.versions.jdk.get().toInt()

kotlin {
    jvmToolchain(jdkVersion)
}

godot {
    registrationFileBaseDir.set(projectDir.resolve("scripts"))
    isRegistrationFileGenerationEnabled.set(true)
}
```

**Catalog naming convention:** TOML keys use `kebab-case`
(`godot-kotlin-jvm`), but in Kotlin DSL they're addressed as
`libs.plugins.godot.kotlin.jvm` — Gradle replaces `-` with `.` to build a
dotted accessor path. So `kotlinx-datetime` becomes `libs.kotlinx.datetime`.

For plugin `0.16.x` the godot-block DSL changes
(`registrationFilesDirectory`, `languages.set(setOf(GodotLanguage.KOTLIN))`,
etc.). See `references/dsl-by-version.md`.

**Why `foojay-resolver` + `jvmToolchain(17)`:** Godot's "Run gradle" button
launches Gradle with the *system* JDK, which is often too new (Kotlin 2.0.x in
the older plugin only supports JVM targets ≤ 23). Pinning the toolchain in
`build.gradle.kts` makes Gradle self-sufficient on any machine — foojay
auto-downloads JDK 17 if not present. Don't hardcode `org.gradle.java.home` —
that's machine-specific and breaks for collaborators.

## Writing a registered class

A class that Godot can attach to a node must:

1. **Extend a Godot type** from `godot.api.*` (Node, Node2D, Resource, etc.).
2. Have `@RegisterClass` on the class.
3. Have `@RegisterFunction` on each lifecycle method (`_ready`, `_process`, ...).
4. Have a **public no-arg constructor** — the plugin instantiates via
   reflection. Kotlin auto-provides one if all constructor parameters have
   defaults AND the class has `@JvmOverloads` on the constructor; otherwise
   write a secondary no-arg constructor.

```kotlin
import godot.annotation.RegisterClass
import godot.annotation.RegisterFunction
import godot.api.Node2D
import godot.global.GD

@RegisterClass
class Game : Node2D() {
    @RegisterFunction
    override fun _ready() {
        GD.print("Hello from Kotlin")
    }
}
```

Plain helper classes (data classes, etc.) used only from inside other Kotlin
code do **not** need `@RegisterClass`. Registration is only for classes
attached to nodes or referenced from GDScript.

## Editor workflow

The editor's "Attach Script" dialog (the one with `Language: Kotlin`,
`Template: Empty`, `Create` button) is for *creating new* scripts and **does
not work** for loading existing `.gdj` files. To attach a `.gdj`:

1. Run `./gradlew build` — produces `scripts/<Pkg>/<Class>.gdj`.
2. In Godot editor, **Project → Reload Current Project** (so the editor sees
   new `.gdj` files).
3. Select the node in the scene tree.
4. In the **Inspector** (right panel), scroll to the `Script` property at the
   bottom.
5. Click the dropdown arrow on the Script field → **Load** → browse to
   `res://scripts/<Pkg>/<Class>.gdj` → Open.
6. Save scene (Ctrl+S). The `.tscn` now has a `script = ExtResource(...)`
   line on the node.
7. F5 to run.

Alternative: drag the `.gdj` from the FileSystem panel onto the node.

## Output and logging

Use `godot.global.GD.print(...)`, **not** `println(...)`. Plain Kotlin
`println` writes to JVM stdout (the terminal that launched Godot), not the
editor's Output panel. `GD.print` routes through Godot's logging system.

## Embedded JRE

The engine warns `You really should embed a JRE in your project with jlink!`
on every run unless `jvm/jre-<arch>-<os>/` exists. The plugin provides:

```bash
./gradlew generateEmbeddedJre
```

But the task requires `javaHome` to be configured. The property is a plain
`String` (not a Gradle `Property<T>`), so assignment uses `=` not `.set()`:

```kotlin
val javaToolchains = extensions.getByType<JavaToolchainService>()
val jdk17 = javaToolchains.launcherFor {
    languageVersion.set(JavaLanguageVersion.of(17))
}

tasks.named<godot.gradle.tasks.GenerateEmbeddedJreTask>("generateEmbeddedJre") {
    javaHome = jdk17.get().metadata.installationPath.asFile.absolutePath
}
```

Default modules are `java.base,java.logging`. Output goes to
`jvm/jre-amd64-linux/` (or platform equivalent). Add the per-platform JRE
folder to `.gitignore` — it's regenerable and ~50MB+.

## .gitignore strategy

Ignore:
- `build/`, `.gradle/` — Gradle output and cache
- `jvm/` — runtime JARs and embedded JRE (regenerated by build / generateEmbeddedJre)
- `.idea/`, `*.iml`, `.kotlin/` — IDE noise
- `.godot/`, `/android/` — Godot editor cache and Android export staging

Do NOT ignore:
- `scripts/` and `scripts/**/*.gdj` — referenced by `.tscn` files via
  `res://scripts/X.gdj`. If missing, scenes won't load Kotlin nodes
  properly on clone. They're text files, small, and stable.

## Error → fix lookup

See `references/errors.md` for the full lookup table. The most common ones:

| Error | Cause | Fix |
|-------|-------|-----|
| `Version mismatch! C++ module is X / Jar is Y` | Plugin tag's Godot version ≠ editor binary | Change plugin tag in `build.gradle.kts` to match |
| `Inconsistent JVM-target compatibility detected for tasks 'compileJava' (N) and 'kspKotlin' (M)` | JDK too new for plugin's pinned Kotlin | Add `kotlin { jvmToolchain(17) }` |
| `RegisteredClass does not have a public default constructor` | Registered class lacks no-arg ctor | Add `@JvmOverloads` (with defaults), or add secondary no-arg ctor, or don't register a plain data class |
| `Unresolved reference 'Instant'` / `'Clock'` from `kotlin.time.*` | `kotlin.time.Instant` needs Kotlin 2.1+; plugin pins older | Add `org.jetbrains.kotlinx:kotlinx-datetime:0.6.2` and import from `kotlinx.datetime.*` |
| KSP: `Collection contains no element matching the predicate` | `@RegisterClass` on class that doesn't extend a Godot type | Make the class extend a `godot.api.*` type, or remove `@RegisterClass` |
| `Unresolved reference 'set'` on `javaHome.set(...)` | `javaHome` on `GenerateEmbeddedJreTask` is `String`, not `Property<T>` | Use `javaHome = "..."` (direct assignment) |
| Engine warning: `You really should embed a JRE` | No `jvm/jre-*` folder | Run `./gradlew generateEmbeddedJre` (after configuring `javaHome`) |

## When user is starting fresh

If the user has only the Godot editor's stock empty project (no Gradle files),
the steps are:

1. Confirm the editor binary version (`Help → About` or `config/features` in
   `project.godot`). Pick the matching plugin tag.
2. Author `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`.
   Don't use `gradle init` — it generates a generic skeleton that fights the
   plugin.
3. `gradle wrapper --gradle-version=8.10` (or whatever version the plugin
   tolerates — 9.x has occasional incompatibilities with older plugin
   versions).
4. Create `src/main/kotlin/<Class>.kt` with `@RegisterClass`.
5. `./gradlew build` → check `scripts/`.
6. Attach in the editor (Inspector → Script → Load).

If IntelliJ scaffolded a Kotlin project first, it likely added
`kotlin("jvm") version "..."` + `jvmToolchain(25)` + test deps. The godot
plugin transitively brings Kotlin, so **remove** the standalone
`kotlin("jvm")` plugin declaration (Gradle won't allow two declarations).
Drop the high `jvmToolchain` value and use `17`.

## References

- `references/minimal-example.md` — complete copy-paste-ready project
  (all files: catalog, settings, build, sources, .gitignore + workflow
  commands). Start here if you're scaffolding from scratch.
- `references/dsl-by-version.md` — full `build.gradle.kts` templates per
  plugin version, including the DSL renames between 0.14.x and 0.16.x.
- `references/errors.md` — extended error catalog with root causes.
- Upstream docs (often missing per-version details, link with caution):
  <https://godot-kotl.in/en/stable/>
- Project template (current plugin version only):
  <https://github.com/utopia-rise/godot-kotlin-project-template>
- Plugin source / releases:
  <https://github.com/utopia-rise/godot-kotlin-jvm/releases>
