---
name: godot-kotlin-jvm
description: Godot Kotlin/JVM — @RegisterClass, version mismatches, embedded JRE, signal-to-Flow, component composition. Use for com.utopia-rise.godot-kotlin-jvm projects, .gdj files, or .kt next to project.godot.
---

# Godot Kotlin/JVM

This skill captures the practical workflow for godot-kotlin-jvm projects — the
JVM-backed Kotlin scripting layer for the Godot game engine (custom fork). The
plugin's DSL has changed across versions, the editor's "Attach Script" UI does
NOT work for `.gdj` files, and several errors look engine-related but are
actually Gradle/Kotlin-side issues. The aim of this skill is to short-circuit
all of that.

**Companion skill — load `godot` alongside this one.** It covers
engine-general knowledge that applies regardless of scripting language:
scene-tree composition, signal-wiring conventions, common pitfalls
(negative-scale physics trap, preload memory chains, Sprite2D offset vs
position), VisibleOnScreen culling, pixel-art resolution setup, editor
tips. This skill stays focused on the Kotlin/JVM layer on top — the
plugin, the registration model, Flow wrappers around signals, and the
Kotlin-side architecture patterns.

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

## Signals: connecting from Kotlin

Built-in Godot signals on nodes (`bodyEntered` on `Area2D`, `pressed` on
`Button`, etc.) are connectable directly from Kotlin via the generated
signal properties on the binding. No GDScript shim required.

The general advice — *wire signals in code in `_ready()`, not in the
editor's Connect dialog* — lives in the `godot` skill (refactor-safety,
greppability, scene-diff hygiene). It applies identically to Kotlin.

To turn a signal into a Kotlin `Flow`, wrap it with `callbackFlow` — the
symmetric "connect on collection, disconnect on cancellation" guarantee
prevents double subscriptions and leaks:

```kotlin
val playerEntered: Flow<Node2D> = callbackFlow {
    val callable = Callable { body: Node2D -> trySend(body) }
    bodyEntered.connect(callable)
    awaitClose { bodyEntered.disconnect(callable) }
}
```

The exact `Callable` construction and connect/disconnect surface vary
between binding versions. See `references/architecture.md` for current
patterns and a full worked example.

## Architecture: Kotlin-side patterns

The engine-level composition story (the four-level spectrum, "Call Down
Signal Up," passive components, mechanism vs content, rule of three)
lives in the `godot` skill at `references/composition.md`. **Load that
first.** This section is only the Kotlin-specific application of those
principles.

### Default to plain Kotlin classes (level 1)

For solo, code-first work, the right shape is almost always a plain
Kotlin class in a `components/` package — no `@RegisterClass`, no
`godot.api.Node`, no `.gdj`. The entity controller instantiates it in
`_ready()` and calls methods on it each frame.

```kotlin
// components/Movement.kt — plain class, no annotations, no godot inheritance
package components

import godot.api.CharacterBody2D
import godot.core.Vector2

class Movement {
    fun move(body: CharacterBody2D, direction: Vector2, speed: Int) {
        body.velocity = direction * speed
        body.moveAndSlide()
    }
}
```

```kotlin
// components/HumanoidToolAnimation.kt — plain class, takes its dep at construction
package components

import godot.api.AnimationNodeOneShot
import godot.api.AnimationNodeStateMachinePlayback
import godot.api.AnimationTree
import godot.core.Vector2

class HumanoidToolAnimation(private val tree: AnimationTree) {
    private val moveStateMachine: AnimationNodeStateMachinePlayback =
        tree.get("parameters/MoveStateMachine/playback") as AnimationNodeStateMachinePlayback
    private val toolStateMachine: AnimationNodeStateMachinePlayback =
        tree.get("parameters/ToolStateMachine/playback") as AnimationNodeStateMachinePlayback

    fun applyPose(tool: Data.Tool, facing: Vector2, isMoving: Boolean) { /* ... */ }
    fun fireToolOneShot() {
        tree.set("parameters/ToolOneShot/request", AnimationNodeOneShot.OneShotRequest.FIRE.value)
    }
}
```

```kotlin
// Player.kt — the controller. Owns _physicsProcess, instantiates components.
@RegisterClass
class Player : CharacterBody2D() {

    private val movement: Movement = Movement()
    private lateinit var animation: HumanoidToolAnimation

    private data class PlayerState(val speed: Int = 150, val facing: Vector2 = Vector2.DOWN, /* ... */)
    private var state: PlayerState = PlayerState()

    @RegisterFunction
    override fun _ready() {
        val tree: AnimationTree = getNode("Animation/AnimationTree") as AnimationTree
        animation = HumanoidToolAnimation(tree)
    }

    @RegisterFunction
    override fun _physicsProcess(delta: Double) {
        val dir: Vector2 = Input.getVector("left", "right", "up", "down")
        movement.move(this, dir, state.speed)
        animation.applyPose(state.currentTool, state.facing, dir != Vector2.ZERO)
    }
}
```

When Zombie arrives, it reuses the same Kotlin classes — instantiates
`Movement()` and `HumanoidToolAnimation(getNode(...))` in its own
`_ready()` with its own `speed`. Reuse at the class level, no scene
wiring.

### Wire by `getNode("X") as T`, not `@Export`

Reach child nodes via `getNode("Child") as T` in `_ready()` rather than
`@RegisterProperty @Export lateinit var child: T`. The `@Export` slot
requires a drag in the Inspector for every entity scene that uses it,
and the wiring is opaque (a `NodePath` blob in `.tscn`) — moving or
renaming a Kotlin script breaks the wiring silently. `getNode` paths
are IDE-`grep`pable and the failure mode is a loud runtime cast
exception when the child name is wrong. Pick the failure mode you can
debug.

The trade-off the other way is real (code refs break on node renames,
editor refs survive them) but for solo code-first work, code wiring
wins. Reserve `@Export` for two cases only:

- A designer needs to compose the scene without writing Kotlin.
- The value is genuinely per-instance Inspector-tunable (a `max_hp` you
  want to vary per mob in the editor).

### When to escalate to a Node-backed component

Promote a plain Kotlin class to a `@RegisterClass` Node subclass only
when one of these is **concretely** true (not "someday"):

- You want per-entity values like `max_hp` / `speed` /
  `damage_multiplier` to be tunable in the Inspector without
  recompiling, via `@RegisterProperty @Export`.
- You need engine lifecycle the component itself owns — a hurtbox
  rooted on `Area2D` reacting to its own `bodyEntered` signal, or a
  state-machine component driving its own `_process`.
- A designer (not you) composes new entities by dragging components.

The promotion is mechanical: same method signatures, same call shape
from the controller; just change the class to extend a `godot.api.*`
type, add `@RegisterClass`, move dep init from constructor to
`_ready()`, and (if you want Inspector knobs) add `@RegisterProperty
@Export` on the configurable fields. See `references/architecture.md`
for the worked level-2/3 example with Coroutines/StateFlow wiring.

If none of those criteria apply, stay at level 1. Most solo / code-first
projects never need to escalate.

### Constructors, no-arg, and `@Export` field init

A `@RegisterClass` needs a **public no-arg constructor** — the plugin
instantiates via reflection. Kotlin auto-provides one if all
constructor parameters have defaults *and* the class has
`@JvmOverloads` on the constructor; otherwise write a secondary no-arg
constructor.

`@Export` fields are populated by the engine *after construction, but
before `_ready`*. So:

- Never read an `@Export` field in a field initializer (`val handle =
  exportedTree.get(...)` at the class level). The export isn't set yet
  → NPE. Move the init to `_ready`.
- Use `lateinit var` (or `var` with a sensible default) for `@Export`
  Node references.

### Name collisions with `Node` getters

Avoid `@Export` (or any) property name that collides with a `Node`
getter — `tree`, `name`, `position`, `path`, `parent`, `owner`.
Declaring `@RegisterProperty @Export lateinit var tree: AnimationTree`
generates a Kotlin `getTree(): AnimationTree` that shadows
`Node.getTree(): SceneTree?` — compiles, but creates accessor
confusion that varies across plugin versions, and `node.tree` reads as
the SceneTree to a reader. Rename: `animationTree`, `displayName`,
`targetPosition`.

### Pure Kotlin helpers stay plain

Damage formulas, item stat tables, save serialisation, math utilities
— anything that's pure computation with no engine lifecycle — keep as
plain Kotlin classes in `domain/` or similar. No `@RegisterClass`, no
`godot.*` imports. JVM-testable without launching Godot.

The line is *"does this need to be in the scene tree?"* — yes →
`@RegisterClass`. No → plain class. The level-1 components above (`Movement`,
`HumanoidToolAnimation`) are plain classes that happen to *take* Godot
types as method args — they don't extend any.

### Coroutines / StateFlow — only when it earns its place

Don't reach for `MutableStateFlow`, `MutableSharedFlow`, or `callbackFlow`
inside per-frame gameplay components. `_physicsProcess` is synchronous;
introducing a Flow adds latency, frame-order ambiguity, and a
`CoroutineScope` you have to remember to cancel on `_exitTree`.

Flows earn their place for **cross-system observation** — UI listening
to a `GameStore`'s `pauseState`, a save system reacting to inventory
changes, an analytics emitter watching milestones. Anything where
multiple independent subscribers want a consistent view of a value
*over time*.

For intra-frame mechanics, plain mutators (`damage(n)`,
`addToInventory(item)`) and entity-owned `data class` state are the
right tools. The state Flow is one of many things a component might
expose; it's not the default.

See `references/architecture.md` for: the full level-3 worked example
(Player + Health + Movement + Animation as registered Node
components), `NodeScope` helper for tying coroutines to node lifetime,
`callbackFlow` wrappers around signals, sealed-action MVI patterns for
game-wide state, and migration paths between levels.

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

Use `godot.global.GD.print(...)` (and `GD.printErr`, `GD.pushWarning`,
`GD.pushError`), **not** `println(...)`. Plain Kotlin `println` writes to
JVM stdout — visible only in the terminal that launched the editor, not
in the Output panel. `GD.print` routes through Godot's logging system.

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
- `references/architecture.md` — composition + components worked example
  (Player + Health + Movement + Animation), `NodeScope` helper, signal
  wrapping via `callbackFlow`, MVI direct-methods vs sealed-actions
  threshold.
- `references/settings-menu.md` — AAA-style settings menu design:
  sealed `Settings` hierarchy, `SettingsService` with `update<T>` typed
  dispatch, live-apply + 2s debounced JSON persistence, per-tab engine
  applier, keybind rebind capture, cross-platform UX. Read when
  starting a settings system or reviewing one.
- `references/steam-publishing.md` — Steam distribution and Steamworks
  API integration. Why GodotSteam is incompatible (custom fork
  collision), why steamworks4j (JNI) is the realistic path, autoload +
  `runCallbacks` lifecycle, per-target Export Preset packaging, dev
  account flow (Steam Direct $100, App ID, Spacewar 480, branches),
  Steam Deck Verified considerations. Read when planning Steam
  integration.
- Upstream docs (often missing per-version details, link with caution):
  <https://godot-kotl.in/en/stable/>
- Project template (current plugin version only):
  <https://github.com/utopia-rise/godot-kotlin-project-template>
- Plugin source / releases:
  <https://github.com/utopia-rise/godot-kotlin-jvm/releases>
