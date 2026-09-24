---
name: godot-kotlin-jvm
description: Godot-JVM, the Kotlin/Java/Scala binding for Godot: GDExtension addon install, @Script registration, signals and callables, coroutines, the Gradle plugin, build and export. Load this whenever a project puts JVM code in a Godot project: an addons/jvm/jvm.gdextension file, the com.utopia-rise.godot-jvm Gradle plugin, .kt/.java/.scala files attached to nodes as scripts, .gdj registration files, godot_jvm_configuration.json, or sources next to project.godot. Also load it for "can I write a Godot game in Kotlin", for a script/property/signal that does not show up in Godot after a build, for JVM-side signal or coroutine questions in a Godot context, and for exporting a JVM game (embedded JRE, Android, GraalVM native image).
---

# Godot-JVM

The JVM language binding for Godot, from utopia-rise. This skill covers the
**1.0.0 line**: a GDExtension addon that runs on the **official Godot editor
and export templates**, with a Gradle plugin that compiles your code and
generates the registration glue.

> **If you open a project that uses `@RegisterClass`, attaches `.gdj` files to
> nodes, or declares `com.utopia-rise.godot-kotlin-jvm`, it is on the
> pre-1.0 module line** (0.13 through 0.17), which needed a custom-built Godot
> editor. Nothing in this skill applies verbatim there: the annotations, the
> script-attach model and the plugin id all changed. Either migrate the project
> to 1.0.0 or read that version's own docs.

**Companion skills, load alongside this one:**

- **`godot`** for engine-level knowledge that is language independent: scene
  composition, signal-wiring conventions, culling, pixel-art setup, editor
  tips. Its `references/composition.md` holds the composition spectrum this
  skill's architecture reference builds on.
- **`kotlin`** for language idioms and formatting. Its coroutine guidance now
  applies here too, with one addition: inside a `Node`, start coroutines with
  `Node.launch` so the binding cancels them when the node leaves the tree. See
  `references/coroutines.md`.
- **`software-design`** for layering and typed-error philosophy.
- **`gradle`** when the build itself is the subject.

## Mental model

- The binding is a **GDExtension addon** living at `addons/jvm/` in your Godot
  project. Stock Godot loads it, so there is no forked editor and no special
  export templates.
- The **Gradle plugin** (`com.utopia-rise.godot-jvm`) compiles your sources,
  then scans the resulting bytecode with **ClassGraph** and generates a
  registrar per registered class. There is no Kotlin compiler plugin and no
  KSP, so the registration step reads what the compiler actually produced.
- Build output is `jvm/main.jar` plus `jvm/godot-bootstrap.jar` at the project
  root. Godot loads those at runtime.
- **The source file is the script.** Attach `Player.kt` to a node the same way
  you would attach `player.gd`. `.gdj` registration files are generated only
  for registered classes that come from *external dependencies*, since those
  have no source file inside the Godot project.
- The Gradle project root and the Godot project root are the same directory by
  default (the one holding `project.godot`).
- Your entry point is `_ready()`, a Godot lifecycle method. `./gradlew run`
  means nothing here: Godot runs your code, Gradle only builds it.

## Versions and compatibility

| Requirement | Minimum |
|---|---|
| Godot (official build) | `4.7.2` |
| JDK (a JDK, not a JRE) | `17` |
| Kotlin | `2.3.20` |
| Scala | `3.0.0` |

Latest release at time of writing: **`1.0.0-dev3`** (2026-08-25), a
prerelease. The `1.0.0` releases are the GDExtension line; `0.17.1-4.7.2` was
the last release of the old module line.

**The addon zip version and the Gradle plugin version must be the same
string.** They are two halves of one release: the addon carries the native
libraries, the plugin generates registrars against that ABI.

Which JVM the game uses is resolved in this order, first hit wins:
`--jvm-path=<jdk home>` on the command line, then an embedded JRE at
`jvm/jre-<arch>-<os>`, then `JAVA_HOME`, then `java` on `PATH`. When someone
reports "Godot is using the wrong JDK", walk that list rather than guessing.

## Setup

Full, verified steps are in `references/setup.md`. The short version:

1. Extract `godot-jvm-addon-<version>.zip` at the Godot project root so that
   `addons/jvm/jvm.gdextension` exists.
2. Open the project once in the editor so Godot registers the extension
   (`.godot/extension_list.cfg` should then name it). Headless equivalent:
   `godot --headless --editor --quit`.
3. Add `build.gradle.kts` with the `com.utopia-rise.godot-jvm` plugin, create
   the wrapper, write a `@Script` class, `./gradlew build`.
4. Attach the source file to a node.

The IntelliJ IDEA plugin ("Godot-JVM" in the marketplace) has a project wizard
that does all of this in one action, and the editor offers
`Project > Tools > Kotlin/JVM > Generate JVM project` for an existing project.
Both are documented upstream; the manual route in `references/setup.md` is the
one verified end to end here.

## Project layout

```
my-game/
├── addons/jvm/                 ← the GDExtension addon (commit it: the game needs it)
│   └── jvm.gdextension
├── src/main/kotlin/            ← your sources; java/ and scala/ if enabled
├── gdj/                        ← generated .gdj files for dependency classes only
├── jvm/                        ← build output: main.jar, godot-bootstrap.jar, jre-*
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/libs.versions.toml
├── godot_jvm_configuration.json  ← runtime JVM flags, written by the binding
└── project.godot
```

Ignore `build/`, `.gradle/`, `.godot/`, `.kotlin/` and `jvm/` in git. Keep
`addons/jvm/` (roughly 36MB of native libraries, but without it a clone cannot
run the game) and `gdj/` (scenes reference those paths).

## Writing a script

Default registration mode is **Inferred**: annotations you write count, and so
do recognized Godot overrides and `SignalN` members. That is why `_ready`
below needs no annotation while `heal` does.

```kotlin
package com.example.game

import godot.annotation.Export
import godot.annotation.Register
import godot.annotation.Script
import godot.api.Node2D
import godot.core.signal1
import godot.global.GD

@Script
class Player : Node2D() {

    @Export
    var maxHp: Int = 100

    val healthChanged by signal1<Int>()

    @Register
    fun heal(amount: Int) {
        maxHp = (maxHp + amount).coerceAtMost(100)
        healthChanged.emit(maxHp)
    }

    override fun _ready() {
        GD.print("Player ready")
    }
}
```

| Goal | Annotation |
|---|---|
| Class usable as a Godot script | `@Script`, or `@Script("CustomName")` |
| Property in the Inspector | `@Export` (a property hint such as `@IntRange` implies it) |
| Property registered but hidden | `@Visible` |
| Function callable from Godot or GDScript | `@Register` |
| Named signal arguments | `@Emit("amount")` on the `SignalN` member |
| Notification handler | `@Notification(...)` on a method |
| Remote procedure call | `@Rpc` |

The rules worth internalizing:

- A script class extends `godot.api.Object` or a subtype, and its **registered
  name must be unique across the whole project**, because Godot has no
  namespaces. Two `MyClass` in different packages collide; the build catches
  it, `@Script("UniqueName")` or `registration.nameMode` resolves it.
- Names cross into Godot as `snake_case`: `healthChanged` is `health_changed`
  in GDScript.
- **Constructors are optional.** A class with no public no-arg constructor
  still registers; Godot simply cannot instantiate it itself (no `.new()` from
  GDScript, no attaching it to a node it must construct). This is the single
  biggest simplification over the old module line, where the missing no-arg
  constructor was a constant source of build failures.
- Abstract classes work and `@Script` on them is optional. Their registered
  members are inherited by concrete subclasses; Godot never sees the abstract
  type itself.

`references/registration.md` has the full selection rules, the `Explicit` and
`Automatic` modes, property hints and grouping, and the signal and callable
API.

## Three traps that cost real time

All three were reproduced on `1.0.0-dev3` against Godot 4.7.2.

**1. One `@Script` class per file.** Godot resolves `res://.../Player.kt` by
finding the *first* `@Script` in the file and taking the class right after it.
A second `@Script` class in the same file is not an error: the node silently
gets the wrong class, so `_ready` never runs and nothing is printed. If a
script "does nothing at all", check that its file declares exactly one
`@Script` class. Payload classes, helpers and sealed hierarchies belong in
their own files.

**2. A signal payload must be a type Godot can carry.** Primitives and core
types are fine, and so is any registered `@Script` class, including your own
`RefCounted` subclass typed directly as the signal parameter. Two failure
modes differ sharply:

- An unrelated JVM class (a `data class`, say) fails **at build time**:
  `Registered signal parameter cannot use unrelated JVM class Loot. Only
  Godot-compatible classes can appear in registered signatures.` That is the
  good case, the build tells you.
- A **bare interface, including a `sealed interface` whose leaves are all
  registered**, passes the build check and then throws a
  `NullPointerException` at the `connectLambda` line when `_ready` runs, because
  the interface itself has no Variant converter. Type the signal on a
  registered class or on an engine type such as `RefCounted` and cast on
  receipt:

```kotlin
// Tool.kt
sealed interface Tool { val label: String }

@Script class Hoe : RefCounted(), Tool { override val label = "hoe" }

// Player.kt: signal typed on the registered leaf, or on RefCounted for several leaves
val toolUsed by signal1<Hoe>()
val anyToolUsed by signal1<RefCounted>()

anyToolUsed.connectLambda { ref -> onTool(ref as Tool) }
```

**3. The extension must have been loaded once before a scene can resolve a
`.kt` script.** Running the game in a project Godot has never opened gives
`No loader found for resource: res://src/main/kotlin/Player.kt (expected type:
Script)`, which reads like a broken script but only means the editor has not
yet scanned the project. Open it in the editor once.

## Build and run

```bash
./gradlew build            # normal loop
./gradlew fastBuild        # method bodies only, reuses the last registration scan
./gradlew buildRelease     # or: ./gradlew build -Prelease
```

After a successful build the editor **reloads `main.jar` and
`godot-bootstrap.jar` on its own**, for structural changes as well as method
bodies, so there is no separate registration step and no editor restart. The
JVM status indicator in the toolbar goes green when the build lands.

`fastBuild` skips the class scan, so use it only when nothing structural
changed. After adding, renaming or removing a registered class, property,
signal or Godot-callable function, run a normal `build`.

Debug builds add sanity checks that release strips; develop on debug.

## Logging

Use `godot.global.GD.print` (plus `GD.printErr`, `GD.pushWarning`,
`GD.pushError`). Kotlin's `println` writes only to the terminal that launched
Godot, never to the editor's Output panel, which is why a script can look dead
while it is in fact running.

## Coroutines

Coroutines are supported and are the idiomatic way to express a sequence of
waits (wait for the player, spawn enemies, wait until they die, grant a
reward). Enable them once in the build:

```kotlin
godot {
    isGodotCoroutinesEnabled.set(true)
}
```

Then `Node.launch` gives a `NodeScope` the binding cancels when the node
leaves the tree, `signal.await()` waits for one emission, `signal.asFlow()`
turns a signal into a `Flow`, and `offload`/`threadSafe` move work off and
back onto the main thread. Details and a worked example in
`references/coroutines.md`.

## Known limitations

- `@Tool` exists but tool mode does nothing yet.
- You cannot write Godot editor plugins or addons in JVM languages yet, only
  game code. Shared libraries are fine.
- No web export. Desktop, Android and iOS only.
- Registered functions take at most 16 parameters; wrap extra values in a
  container.
- A GraalVM native-image build cannot hot-reload code, since that would mean
  restarting the JVM.
- Never wipe the whole `user://` folder from your own code: the exported game
  copies its runtime jars there on first launch.

## Error lookup

| Symptom | Cause | Fix |
|---|---|---|
| `No loader found for resource: <file>.kt (expected type: Script)` | Extension never loaded in this project | Open the project in the editor once |
| Script attached but `_ready` never runs, no error | A second `@Script` class earlier in the same file won the file association | One `@Script` class per file |
| `Registered signal parameter cannot use unrelated JVM class X` | Signal payload is not Godot-compatible | Use a primitive, a core type, or a registered class |
| `NullPointerException` at a `connectLambda` in `_ready` | Signal typed on an interface with no Variant converter | Type it on a registered class or `RefCounted`, cast on receipt |
| `You really should embed a JRE in your project with jlink!` | No `jvm/jre-<arch>-<os>` | `./gradlew generateEmbeddedJre` |
| Godot runs a different JDK than the shell does | `JAVA_HOME` beats `PATH`, an embedded JRE beats both | Follow the resolution order above |
| A property, function or signal is missing after a build | Registration selection rule not met | `references/errors.md`, "declaration missing" |

The full catalog, including export and Android specifics, is in
`references/errors.md`.

## References

- `references/setup.md`: verified end-to-end scaffold: addon install, Gradle
  files, first script, headless verification, embedded JRE, export notes,
  runtime configuration flags.
- `references/registration.md`: annotations, the three registration modes,
  properties and Inspector grouping, constructors, signals and callables,
  attaching scripts and `.gdj` handling.
- `references/coroutines.md`: node-owned scopes, frame waits, signal
  `await`/`asFlow`, threading rules.
- `references/architecture.md`: how to slice a game into components, what
  talks to what (signals, reads, calls, coroutines), code wiring versus
  Inspector wiring, keeping pure logic engine-free.
- `references/errors.md`: symptom-to-fix catalog.
- `references/settings-menu.md`: worked settings-menu system: sealed settings
  hierarchy, typed service, live apply plus debounced persistence, keybind
  rebinding.
- `references/steam-publishing.md`: Steam distribution and Steamworks
  integration options now that the binding is a GDExtension.
- Upstream docs: <https://godot-jvm.dev>, releases:
  <https://github.com/utopia-rise/godot-jvm/releases>
