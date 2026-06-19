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

> **⚠️ NEVER hand-create, edit, move, rename, or `rm` a `.gdj` file.** They are
> build outputs wholly owned by the Gradle plugin — it creates, updates, *and
> deletes* them in lockstep with your Kotlin sources. Want a `.gdj` gone? Delete
> or rename the **Kotlin class**, then `./gradlew build` and the plugin removes
> the stale `.gdj` itself. Manually touching one desyncs the plugin's tracking
> and can break its Godot-side task or leave the project in limbo. To change a
> registration, **always edit the `.kt` source and rebuild — never the `.gdj`.**
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
   reflection. The reliable form is an explicit empty primary constructor (or
   no params at all) plus a secondary for convenience. **Version-dependent:** on
   0.14.3 both `class X(var n: Int = 0)` and `@JvmOverloads constructor(var n:
   Int = 0)` FAIL the KSP no-arg check (it reads the source ctor). On 0.16.x an
   all-defaults primary ctor (`class X(val n: Int = 0)`) is accepted — the
   ClassGraph processor sees Kotlin's synthetic no-arg ctor in bytecode; only a
   param *without* a default fails.

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

### Declaring your own signal — `@RegisterSignal` is mandatory

A signal you *emit* (Player → Level "tool used", Health → "died") is declared
as a property with a `signalN<…>()` delegate **and** annotated
`@RegisterSignal`. The annotation is what makes KSP register the signal with
the engine. **Without it the property still compiles, but `emit`/`connect`
silently do nothing** — no exception, no warning.

```kotlin
import godot.annotation.RegisterSignal
import godot.core.signal1
import godot.core.connect   // for the .connect { } lambda overload

@RegisterClass
class Player : CharacterBody2D() {
    @RegisterSignal
    val toolUse by signal1<String>()        // Godot signal name: tool_use

    private fun onAction() = toolUse.emit("HOE")
}
```

- **Arity:** `signal0()` (no args), `signal1<A>()`, `signal2<A, B>()`, … up to
  `signal16`. Each yields a typed `emit(...)` and a typed `connect { }`.
- **Naming:** the property name is converted to snake_case for the Godot side
  (`toolUse` → `tool_use`). The annotation's KDoc mentions a required `signal`
  prefix, but the **delegate form does not need it** — verified on 0.14.3
  (`toolUse` registered fine).
- **Payloads must be Variant types** — a primitive (`Int`, `Float`, `String`,
  `Bool`, `Vector2`, …) or a **registered Godot `Object`**. A Kotlin `enum` or
  plain `data class` is neither. An enum is worse than it looks: a
  `@RegisterSignal signal1<SomeEnum>()` **does not even compile** — the KSP
  processor emits broken `ENUM<…>` codegen. See "Signal payloads" below for the
  `sealed class` standard that fixes this.

**Symptom of a forgotten `@RegisterSignal`:** `emit`/`connect` no-op silently,
and the generated `scripts/<Class>.gdj` shows `signals = [ ]`. The `.gdj` is a
generated file — never edit *or delete* it (see the ⚠️ rule in Mental model);
fix the Kotlin source and rebuild.

### Signal payloads: a primitive, or a registered leaf type

> **⚠️ Plugin 0.16.x changed this — read first.** The `sealed class : RefCounted()`
> "house standard" described below is **0.14.x**. On **0.16.x** it no longer
> builds: any abstract class inheriting a Godot Object is *auto-registered*
> (`isAbstractAndInheritsGodotObject` in the ClassGraph processor), and a
> registered class needs a **public no-arg constructor** — which a `sealed class`
> can't have (its constructors are forced `protected`), so entry generation fails
> with `You should provide a default constructor for class Tool`.
>
> **0.16.x pattern:** make the parent a **`sealed interface`** (excluded from
> auto-registration via `!isInterface`, still gives exhaustive `when`); each leaf
> is `@RegisterClass class Hoe : RefCounted(), Tool`; and **type the signal on a
> registered base — `RefCounted` (or a primitive), never the sealed interface**
> (it isn't a Variant → `connectLambda` NPEs). Emit the leaf, cast back on receive:
> ```kotlin
> sealed interface Tool { val stateName: String }
> @RegisterClass class Hoe : RefCounted(), Tool { override val stateName = "Hoe" }
>
> @RegisterSignal val toolUsed by signal1<RefCounted>()              // registered wire type
> fun onAction() = toolUsed.emit(Hoe() as RefCounted)               // emit the leaf
> source.toolUsed.connectLambda { ref -> onToolUsed(ref as Tool) }  // cast at the boundary
> fun onToolUsed(tool: Tool) = when (tool) { is Hoe -> … }          // sealed ⇒ exhaustive
> ```
> Per-leaf data works on 0.16.x: `@RegisterClass class WateringCan(val water: Int = 0)
> : RefCounted(), Tool`. A primary ctor whose params **all have defaults** is
> accepted (Kotlin synthesizes a public no-arg ctor; the ClassGraph processor reads
> it from bytecode). A param **without** a default still fails.

A signal argument crosses the JVM↔C++ boundary as a **Variant**, so it must be
a Variant primitive or a Godot `Object` — nothing else. This is the same rule
GDScript follows: GDScript can `emit(my_class)` only because its classes extend
`Object`, which *is* a Variant. At bootstrap the binding registers every
`@RegisterClass` (and every engine type) into its Variant table as `OBJECT`
(`Bootstrap.kt`: `variantMapper[clazz] = VariantParser.OBJECT`), so a
**registered** class instance rides a signal *by reference*, with no
encode/decode. A plain `enum`/`data class` isn't registered, so the runtime
`ANY` caster fails its `variantMapper[any::class]` lookup.

Two payload shapes, by richness:

1. **Just a number or a label** → emit a **primitive**. `signal1<Int>()`,
   `signal1<String>()`. If the value is an internal `enum`, send `enum.name` /
   `enum.ordinal` and map back with `Enum.valueOf(...)` / `Enum.entries[i]`.
   Cheapest; no per-variant `.gdj`.

2. **A domain type with variants / per-case data** → the **house standard**:
   a **`sealed class` extending `RefCounted`**, each case a `@RegisterClass`,
   the signal typed on the sealed parent. The processor generates an `OBJECT`
   converter and the concrete case rides the signal directly — prefer this over
   enums-plus-ad-hoc-codecs so every project uses one consistent shape.

   ```kotlin
   sealed class Tool : RefCounted() {             // sealed CLASS, not interface
       abstract val stateName: String             // per-TYPE stats → abstract vals,
       abstract val damage: Int                   // overridden as constants per variant
   }
   @RegisterClass class Hoe : Tool() {            // constants only → implicit no-arg ctor
       override val stateName = "Hoe"
       override val damage = 0
   }
   @RegisterClass class WateringCan() : Tool() {  // per-INSTANCE data → explicit empty
       override val stateName = "Water"           // primary ctor + a secondary (defaults
       override val damage = 0                    // do NOT satisfy the KSP no-arg check)
       var water: Int = 0
       constructor(water: Int) : this() { this.water = water }
   }

   @RegisterClass
   class Player : CharacterBody2D() {
       @RegisterSignal val toolUsed by signal1<Tool>()
       private fun onAction() = toolUsed.emit(Hoe())   // arrives as Tool, no decode
   }
   ```

   **Per-type stats (damage, stateName) belong as overridden vals**, not
   constructor params — that keeps the common variant a zero-boilerplate no-arg
   class; reserve the explicit-ctor + `lateinit` dance for fields that genuinely
   vary per instance.

   > **⚠️ Connecting to a signal typed on an abstract/sealed parent — DON'T use
   > the inline `connect { }` lambda.** It compiles to
   > `variantMapper[DeclaredType]!!`, looking up the signal's *declared* type
   > (here the abstract `Tool`). That map holds engine types and **registered**
   > classes — so built-in signals like `bodyEntered.connect { }` (declared type
   > `Node2D`) are fine, but an abstract sealed *user* parent is neither, and it
   > **can't be `@RegisterClass`** (no instantiable ctor). So
   > `toolUsed.connect { … }` throws a
   > `NullPointerException` **at runtime in Godot** (it compiles fine — gradle is
   > happy). The trace points at the `connect` call site but, because `connect`
   > is `inline`, the reported line is the inlined body, not your source line.
   >
   > Connect via a `@RegisterFunction` handler + **member reference** instead —
   > that builds a `Callable(target, "method_name")` (no registry lookup) and
   > routes the arg through the function's KSP-generated `OBJECT` converter:
   > ```kotlin
   > @RegisterFunction fun onToolUsed(tool: Tool) { /* when (tool) { is Hoe -> … } */ }
   > override fun _ready() { source.toolUsed.connect(this, MyClass::onToolUsed, 0) }
   > ```
   > Emit is unaffected — `emit(Hoe())` dispatches on the concrete, registered
   > `Hoe`. The asymmetry: **emit uses the runtime type (a registered leaf);
   > lambda-connect uses the declared type (the unregistered parent).** The
   > alternative, if you want the inline `connect { }` to work, is to type the
   > signal on a **concrete registered** class (a `@RegisterClass` carrier),
   > whose type *is* in the registry.

Hard constraints the compiler enforces (each verified on 0.14.3):

- **`sealed class`, never `sealed interface`** *(0.14.x only — on 0.16.x it's the
  reverse: a `sealed interface` parent with `RefCounted` leaves, per the callout
  above)*. The interface still can't extend `RefCounted()`, but on 0.16.x it
  doesn't need to — the leaves carry `RefCounted`.
- **The payload class must be top-level, not nested.** `@RegisterClass` on a
  class nested in another (`class Player { @RegisterClass class ToolUse … }`) is
  **silently ignored** — no registrar, no `.gdj`, never added to `variantMapper`.
  It compiles, but `emit` throws `Can't convert type … to Variant` at runtime.
  Declare payload classes at file top level.
- **Variants must be `class`, not `object`/`data object`** — `@RegisterClass`
  needs a public no-arg constructor; the registrar emits `KtConstructor0(::Hoe)`,
  which a singleton object has no `::Hoe` for (`@RegisterClass object Hoe` →
  "Unresolved reference 'Hoe'").
- **A no-arg constructor is mandatory; on 0.14.3 defaults do NOT count** *(0.16.x
  differs)*. On **0.14.3** a primary ctor with all-default params
  (`class WateringCan(var water: Int = 0)`) *and*
  `@JvmOverloads constructor(var water: Int = 0)` both FAIL the KSP check
  ("RegisteredClass does not have a public default constructor") — KSP reads the
  source ctor and doesn't see the synthetic no-arg overload. On **0.16.x** the
  ClassGraph processor reads bytecode, so an **all-defaults primary ctor IS
  accepted** (`class WateringCan(val water: Int = 0)`); only a param *without* a
  default fails. No-data cases use the implicit ctor (`class Hoe : Tool()`).
- **The no-arg ctor must be `public` — you can't hide it.** `private`/`internal`
  both fail the same "public default constructor" check (the engine
  reflection-instantiates registered classes). To stop the mandatory empty ctor
  from being *misused* (constructing a payload without its data), make the data
  fields **`lateinit`** instead of giving them a silent default. The real
  secondary ctor sets them; an accidental no-arg `WateringCan()` then leaves them
  unset, so the first read throws a clear `UninitializedPropertyAccessException`
  rather than handing back a wrong default. It's safe in the signal path because
  the receiver gets the same instance by reference, never a re-constructed blank
  one. (`lateinit` needs a non-null reference type — fine for an enum/class
  field, not for a primitive `Int`; there, keep a nullable or a sentinel.)
- **No free `.entries`** — a sealed class doesn't enumerate its cases; keep a
  manual `val all = listOf(Hoe(), …)` if you need iteration.

**Place each stat by how many cases share it** — this is the payoff over an
enum, where every constant must carry the same fields:

- *Every* case has it (e.g. `stateName`) → `abstract val` on the sealed parent.
- *Some* cases share it (e.g. `damage` for weapons) → an intermediate
  `sealed class Weapon : Tool()` holding the `abstract val`; only the concrete
  leaves are `@RegisterClass` (the intermediate is never emitted, so it stays
  unregistered). Verified: a two-level `RefCounted` → `Tool` → `Weapon` → `Axe`
  hierarchy registers fine.
- *One* case has it (e.g. `depth` on a shovel) → a plain field on that variant
  only; reach it via a `when (tool) { is Shovel -> tool.depth }` smart-cast.

Don't force a `damage = 0` onto tools that have no damage just to satisfy a
parent — that's the enum limitation the sealed hierarchy exists to escape.

Cost to weigh against the standard: each case is a `@RegisterClass` (own
generated `.gdj`, heap-allocated `RefCounted`, allocated per `emit`). For a
fixed set of interchangeable labels with no per-case data, shape (1) — a
primitive — is genuinely lighter. The `sealed class` standard earns its keep
once the cases actually differ.

### Direct one-off connect: `connectLambda` / `connectMethod` in plugin 0.16.x

For a single callback (not a Flow), connect in `_ready()`. In **0.16.x** the
base `connect` on a typed signal takes a pre-built `CallableN` plus a
`ConnectFlags` **enum** (not an `Int`):

```
Signal2<P0, P1>.connect(callable: Callable2<*, P0, P1>, flags: Object.ConnectFlags = DEFAULT)
```

You rarely build the `Callable` by hand — two extensions in `godot.extension`
do it, both with a defaulted `flags` so the trailing-lambda / reference form is
clean:

```kotlin
import godot.extension.connectLambda
import godot.extension.connectMethod

override fun _ready() {
    tree.animationStarted.connectLambda { animName -> onAnimStarted(animName) }
    tree.animationFinished.connectLambda { onAnimFinished() }   // arg ignorable

    source.toolUsed.connectMethod(this, Level::onToolUsed)      // named MethodCallable
}
```

**`connectLambda` resolves the payload converters eagerly** at the connect
call: `method.asCallable()` → `lambdaCallableN(...)` →
`getVariantConverter<P0>()!!` = `variantMapper[P0::class]!!`. So **every declared
payload type must be a registered Variant** — a primitive, or a registered
Godot Object / engine type (`RefCounted`, `StringName`, `Node2D`, …). If the
declared type is unregistered (a `sealed interface`, an `enum`, a plain class),
`variantMapper[it]` is null and you get a **`NullPointerException` at the
connect line in `_ready()`** — compiles clean, crashes at runtime. (Because
`connectLambda` is `inline`, the trace line is the inlined body, often
misleading.) This is the #1 0.16.x signal trap: see the payload callout above —
type the signal on `RefCounted` (or a primitive), never the sealed parent.

`connectMethod(target, Class::method)` builds a `MethodCallable(target,
"method_name")` and does **no `variantMapper` lookup at connect time** (arg
conversion happens at call time through the `@RegisterFunction`'s own
converters) — the escape hatch when the lambda path can't resolve a type.

The `connect { }` + `import godot.core.connect` trailing-lambda form is **0.14.x
only** and does not exist in 0.16.x. (A `connect(target, Class::method, flags:
Int)` member-reference overload exists in **neither** version — earlier notes
claiming it for 0.16.x were wrong; use `connectLambda` / `connectMethod`.) There
is no top-level `callable { }` builder; the underlying helpers are
`lambdaCallableN(...)` / `.asCallable()` and `methodCallableN(...)` in
`godot.core`.

### Direct one-off connect: typed `Signal1` in plugin 0.14.x (trailing lambda)

The DSL is **different** in 0.14.x — and nicer. The base `godot.core.Signal`
only exposes `connect(callable: Callable, flags: Int = 0)`, but each typed
`SignalN` has a **trailing-lambda extension** that builds the `Callable` for
you. So the clean form for a one-off connect is just:

```kotlin
import godot.core.connect   // REQUIRED — the lambda overload is an extension fn

override fun _ready() {
    val tree = getNode("Animation/AnimationTree") as AnimationTree
    tree.animationStarted.connect { animName -> onAnimStarted(animName) }
    tree.animationFinished.connect { animName -> onAnimFinished(animName) }
}
```

Pitfalls in 0.14.x:

- **Missing `import godot.core.connect`** is the #1 gotcha. Without it, only
  the base `connect(Callable, Int)` is in scope, so a trailing lambda won't
  resolve and you get a confusing overload/type error. The IDE often does not
  auto-suggest it because the base `connect` already resolves the name.
- Passing a **bare function name** — `connect(onAnimStarted, 0)` — does not
  compile: a function name is not a value reference (needs `::`), and a
  `KFunction` is not a `Callable`. Use the trailing lambda instead.
- The handler is referenced from inside Kotlin, so it does **not** strictly
  need `@RegisterFunction` for this connect form (the lambda holds the
  reference directly). Add `@RegisterFunction` only if Godot/GDScript also
  calls it by name.

Contrast with **0.16.x**, where `import godot.core.connect` is gone and you use
`connectLambda { }` / `connectMethod(target, ::m)` from `godot.extension` (see
the section above). When in doubt which DSL you're on, check the plugin tag in
`gradle/libs.versions.toml`: `0.14.x` → `connect { }` + `import godot.core.connect`;
`0.16.x` → `connectLambda` / `connectMethod`.

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
for the worked level-2/3 example with signal-based component wiring.

If none of those criteria apply, stay at level 1. Most solo / code-first
projects never need to escalate.

### Constructors, no-arg, and `@Export` field init

A `@RegisterClass` needs a **public no-arg constructor** — the plugin
instantiates via reflection. Write an explicit empty primary constructor
(plus a secondary if you want a convenience overload). Parameter **defaults
do not satisfy the KSP check on 0.14.3** — neither `class X(var n: Int = 0)`
nor `@JvmOverloads constructor(var n: Int = 0)` works; KSP inspects the Kotlin
constructor, which still has a parameter. **On 0.16.x this is fixed** — an
all-defaults primary ctor (`class X(val n: Int = 0)`) is accepted because the
ClassGraph processor reads Kotlin's synthetic no-arg ctor from bytecode.

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

### No coroutines or Flows inside nodes

Don't spawn coroutines (`scope.launch`, `launchIn`) or wrap engine signals in
`callbackFlow`/`StateFlow`/`SharedFlow` inside a registered Node. In
godot-kotlin-jvm this is not merely heavyweight — two facts make it actively
unsafe:

- The binding wraps every engine object in a **weak-referenced** wrapper,
  freed once the native refcount hits 0. A coroutine that outlives its node
  keeps running and can touch a wrapper whose native object is already gone —
  a use-after-free crash far from the line that caused it.
- `shareIn`/`stateIn` (and `callbackFlow` shared through them) **do not hold a
  strong reference to their sharing coroutine**, so the JVM can
  garbage-collect it. A Flow-wrapped signal then silently stops firing — no
  error, no message.

Both failure modes are the hard-to-debug kind: a handler that works for a
while then stops, or a crash unrelated to its trigger. Use the engine's own
mechanisms instead — synchronous, on the main thread, with lifetimes the
engine manages:

- **Discrete events** (died, damaged, tool used, area entered) → a
  `@RegisterSignal` you `emit`, connected with `.connect { }` in a sibling's
  `_ready`.
- **Continuous / derived state** (current HP, velocity, `isMoving`) → a plain
  property the consumer reads when it needs it (`health.hp`,
  `movement.isMoving`), polled in `_process` if it drives per-frame visuals.
- **Intra-frame mechanics** → plain mutators (`damage(n)`,
  `addToInventory(item)`) and entity-owned `data class` state.

`_physicsProcess` is synchronous; nowhere in per-frame gameplay does a
coroutine buy you anything a direct call doesn't.

See `references/architecture.md` for the worked component example (Player +
Health + Movement + Animation) wired entirely with signals and direct calls,
plus the sealed-action dispatch pattern for components that outgrow a couple
of mutators.

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
| `RegisteredClass does not have a public default constructor` (0.14.3) / `You should provide a default constructor for class X` (0.16.x) | Registered class lacks a public no-arg ctor. On 0.14.3 defaults/`@JvmOverloads` don't count; on 0.16.x a `sealed class : RefCounted()` parent also trips this (auto-registered, `protected` ctor) | 0.14.3: explicit empty primary ctor + secondary. 0.16.x: all-defaults primary ctor (`class X(val n: Int = 0)`) works; for a sealed parent use a `sealed interface` + `RefCounted` leaves |
| `NullPointerException` at a `connectLambda` call in `_ready()` (0.16.x) | Signal's declared payload type isn't a registered Variant — `connectLambda` does `variantMapper[P0]!!` | Type the signal on a registered base (`RefCounted`) or a primitive and cast on receive, or use `connectMethod(target, ::handler)` |
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
  (Player + Health + Movement + Animation) wired with `@RegisterSignal`
  signals and direct property reads (no coroutines/Flows), plus the
  direct-methods vs sealed-actions threshold.
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
