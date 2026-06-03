# godot-kotlin-jvm error catalog

Every error in this catalog was seen during a real setup. The "cause" line
explains *why* it happens so you can recognize variants; the "fix" line is
the minimal change.

---

## Runtime (in Godot editor)

### `Version mismatch! C++ module is : X / Jar is : Y`

**Where:** Godot Output panel after running the scene or building from the
"Run gradle" button.

**Cause:** The plugin tag in `build.gradle.kts` doesn't match the Godot
editor binary's fork version. The JAR produced by Gradle and the engine's
native module use different ABI versions.

**Fix:** Change the plugin version string in `build.gradle.kts` so its
Godot-fork-version half matches the editor:

- `0.14.3-4.5.1` for Godot fork 4.5.x
- `0.16.1-4.6.3` for Godot fork 4.6.x

Then `./gradlew clean build` and restart the editor.

---

### `You really should embed a JRE in your project with jlink!`

**Where:** Warning on every Godot launch.

**Cause:** No `jvm/jre-<arch>-<os>/` folder at the project root.

**Fix:** Run `./gradlew generateEmbeddedJre`. If that fails with
`property 'javaHome' doesn't have a configured value`, see the next entry.

This is a warning, not an error — the game runs without it. The embedded JRE
matters for exporting to end users, so they don't need a JDK installed.

---

## Gradle (configuration / build)

### `property 'javaHome' doesn't have a configured value` on `:generateEmbeddedJre`

**Cause:** The `GenerateEmbeddedJreTask` doesn't auto-detect a JDK.

**Fix:** Configure the task in `build.gradle.kts`. `javaHome` is a `String`
field (not a Gradle `Property<T>`), so use `=` not `.set(...)`:

```kotlin
val javaToolchains = extensions.getByType<JavaToolchainService>()
val jdk17 = javaToolchains.launcherFor {
    languageVersion.set(JavaLanguageVersion.of(17))
}
tasks.named<godot.gradle.tasks.GenerateEmbeddedJreTask>("generateEmbeddedJre") {
    javaHome = jdk17.get().metadata.installationPath.asFile.absolutePath
}
```

### `Unresolved reference 'set'` on `javaHome.set(...)`

Same root cause as above — `javaHome` is a plain `String` field, not a
`Property<T>`. Replace `.set(...)` with `=`.

---

### `Inconsistent JVM-target compatibility detected for tasks 'compileJava' (N) and 'kspKotlin' (M)`

**Cause:** The JDK running Gradle is newer than what the plugin's pinned
Kotlin compiler supports. KSP falls back to its max supported target (e.g.
JVM 23 for Kotlin 2.3), while `compileJava` defaults to the running JDK's
target (e.g. JVM 26). They disagree.

**Fix:** Pin a JVM toolchain in `build.gradle.kts`:

```kotlin
kotlin {
    jvmToolchain(17)
}
```

And ensure `settings.gradle.kts` has the foojay resolver so Gradle can
auto-fetch JDK 17 if it's not installed:

```kotlin
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
```

This is the **portable** fix — works on any machine, not just one with a
specific JDK installed. Do not use `org.gradle.java.home=/abs/path/to/jdk`
in `gradle.properties` — that's machine-specific.

---

### `Kotlin does not yet support N JDK target, falling back to Kotlin JVM_M JVM target`

**Cause:** Warning preceding the `Inconsistent JVM-target` error above. The
running JDK is newer than the Kotlin compiler version.

**Fix:** Same as above — pin a toolchain.

---

### `RegisteredClass does not have a public default constructor`

**Cause:** A class annotated `@RegisterClass` lacks a public no-arg
constructor. Godot instantiates registered classes via reflection at
runtime, so this is required.

**Fix:** Write an explicit empty primary constructor (or no params), plus a
secondary for convenience.

**Defaults do NOT satisfy the check** (verified on 0.14.3): both
`class X(var n: Int = 0)` and `@JvmOverloads constructor(var n: Int = 0)` still
fail — KSP inspects the Kotlin constructor (which has a parameter), not the
synthetic JVM no-arg overload `@JvmOverloads` emits. So the reliable options are:

1. Write a secondary no-arg constructor:
   ```kotlin
   class MyNode : Node2D() {
       constructor() : super()
       constructor(x: Int) : this()
   }
   ```

3. If the class isn't actually attached to a Godot node, remove
   `@RegisterClass` — plain Kotlin classes used from other Kotlin code don't
   need registration.

---

### KSP: `java.util.NoSuchElementException: Collection contains no element matching the predicate`

**Cause:** A class is annotated `@RegisterClass` but doesn't extend a Godot
type from `godot.api.*`. The KSP processor can't find the class's Godot
supertype.

**Fix:** Either:
- Make the class extend a Godot type (`Node`, `Node2D`, `Resource`, etc.)
- Or remove `@RegisterClass` — only classes that Godot needs to instantiate
  as scripts should be registered.

---

### `Unresolved reference 'Instant'` / `'Clock'` from `kotlin.time.*`

**Cause:** `kotlin.time.Instant` and `kotlin.time.Clock` were stabilized in
Kotlin **2.1.0**. The 0.13.x / 0.14.x plugins pin Kotlin 2.0.x, which doesn't
have them yet.

**Fix:** Add `kotlinx-datetime` as a dependency and use its `Instant` /
`Clock`:

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.2")
}
```

```kotlin
// in your source
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
```

The API is nearly identical — `Instant.parse(...)`, `Clock.System.now()`,
`Instant.minus(Instant)` returns `kotlin.time.Duration` which has
`.inWholeDays` etc.

---

### `Plugin requires Gradle X` or `NoSuchMethodError: org.gradle.*`

**Cause:** Gradle wrapper version is incompatible with the plugin version.
Older plugins (0.13.x / 0.14.x) were built against Gradle 8.x; Gradle 9
removed/changed some APIs.

**Fix:** Edit `gradle/wrapper/gradle-wrapper.properties` and set
`distributionUrl` to a Gradle 8.10.x build:
```
distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
```
Then run `./gradlew --version` to confirm.

---

## Build script syntax (build.gradle.kts)

### `Unresolved reference 'entrygenerator'` / `'GodotLanguage'` / `'languages'` / `'registrationFilesDirectory'` / `'registrationFilesLayoutMode'`

**Cause:** Using `0.16.x` DSL with `0.14.x` plugin version (or vice versa).
The property names were renamed between major DSL versions.

**Fix:** Match the DSL to the plugin version — see
`references/dsl-by-version.md`. Quick map:

- `registrationFilesDirectory` (0.16.x) ↔ `registrationFileBaseDir` (0.14.x)
- `registrationFilesLayoutMode` (0.16.x) ↔ `isRegistrationFileHierarchyEnabled` (0.14.x)
- `languages.set(setOf(GodotLanguage.KOTLIN))` (0.16.x) — doesn't exist in 0.14.x (Kotlin-only).

---

## Editor UI

### "Attach Script" dialog only has a `Create` button, no `Load`

**Cause:** That dialog is for creating *new* scripts (and works for GDScript,
not really for Kotlin). You cannot use it to attach an existing `.gdj`.

**Fix:** Use the **Inspector** instead:
1. Select the node in the scene tree.
2. Inspector (right panel) → scroll to the `Script` property (near the
   bottom, value is `[empty]`).
3. Click the dropdown arrow on that field → **Load** → browse to
   `res://scripts/<Pkg>/<Class>.gdj`.

Or drag the `.gdj` from the FileSystem panel onto the node.

---

### "Please don't use reserved keywords as file name" in the New Script dialog

The error is misleading. This whole dialog is the wrong path for
godot-kotlin-jvm — close it and use the Inspector → Script → Load flow
described above.

---

## Output not appearing

### `_ready()` runs but no output appears in the Godot Output panel

**Cause:** Using `println(...)` instead of `GD.print(...)`. Plain Kotlin
`println` goes to JVM stdout (the terminal where Godot was launched from),
not the editor's Output panel.

**Fix:** Use `godot.global.GD.print(...)`:

```kotlin
import godot.global.GD
GD.print("message here")
```

If still no output: confirm the script is actually attached to the scene's
root node. Check the `.tscn` file for a `script = ExtResource(...)` line —
without it, no Kotlin code runs.

---

### No output AND `.tscn` has no `script = ExtResource(...)` line

**Cause:** Script never got attached, or the attach happened in a different
scene file.

**Fix:** Reload project (so editor sees current `.gdj`), select the node,
Inspector → Script → Load → pick the `.gdj`, save scene (Ctrl+S).
