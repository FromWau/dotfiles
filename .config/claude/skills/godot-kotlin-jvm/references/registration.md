# Registration: annotations, modes, signals, callables

What Godot can see of your JVM code, and how it decides. Contents:

- [Modes](#modes)
- [Classes](#classes)
- [Properties and the Inspector](#properties-and-the-inspector)
- [Functions and notifications](#functions-and-notifications)
- [Signals](#signals)
- [Callables](#callables)
- [Attaching scripts and .gdj files](#attaching-scripts-and-gdj-files)
- [When a rebuild is required](#when-a-rebuild-is-required)

## Modes

| Mode | Selects | Use when |
|---|---|---|
| `Inferred` (default) | Direct and implied annotations, recognized Godot overrides, `SignalN` members | Almost everything |
| `Explicit` | Direct selection annotations only | Every Godot-facing declaration should be deliberate |
| `Automatic` | All compatible declarations on Godot classes | Public members should be exposed by default |

```kotlin
import godot.annotation.processor.classgraph.AnnotationProcessingMode

godot {
    registration {
        annotationProcessingMode.set(AnnotationProcessingMode.Explicit)
    }
}
```

What selects each kind of declaration:

| Declaration | Inferred | Explicit | Automatic |
|---|---|---|---|
| Script class | `@Script` | direct `@Script` | compatible Godot subclass |
| Property | `@Visible`, `@Export`, or a property hint | direct `@Visible`; add `@Export` for the Inspector | compatible public property |
| Function | `@Register` or `@Rpc` | direct `@Register` or `@Rpc` | compatible public function |
| Godot override | recognized automatically | recognized automatically | recognized automatically |
| Signal | any `SignalN` member | direct `@Emit` | compatible `SignalN` member |
| Notification | `@Notification(...)` | `@Notification(...)` | `@Notification(...)` |

In `Explicit` mode annotations stop implying one another, so an Inspector
property needs both `@Visible` and `@Export`.

If you use the IntelliJ plugin, set **Settings | Godot-JVM | Annotation
processing mode** to the same value as the build. Gradle decides what is
actually registered; the IDE setting only keeps inspections honest. A
disagreement between the two is the usual reason the IDE flags something the
build accepts, or the reverse.

Requirements that hold in every mode:

- The class extends `godot.api.Object` or a subtype, with a unique registered
  Godot name.
- Registered properties are public and Variant-convertible. A core Godot type
  always needs a value, so it cannot be `lateinit`.
- Registered functions are declared on the class, non-generic, use
  Godot-supported parameter and return types, and take at most 16 arguments.
- Godot-facing names become `snake_case`.

## Classes

```kotlin
@Script
class RotatingCube : Node3D()
```

**Uniqueness.** Godot has no namespaces for script classes, so
`com.a.MyClass` and `com.b.MyClass` collide. The build fails on the collision
rather than picking one. Fixes, in order of preference: rename, give one a
custom name with `@Script("RotatingCubeFast")`, or change how default names
are computed:

```kotlin
import godot.registrar.generator.RegisteredNameMode

godot {
    registration {
        nameMode.set(RegisteredNameMode.FQ_NAME)   // or SIMPLE_NAME, PROJECT_PREFIX
    }
}
```

Names coming from GDScript or C# cannot be checked, so a collision with those
is still yours to avoid.

**Constructors are optional.** A class registers with or without a public
no-arg constructor. The constructor only decides whether *Godot* can create
the instance: `YourClass.new()` from GDScript, or attaching the script to a
node the engine instantiates, both need a public no-arg constructor.
Constructors with arguments are never exposed to Godot, but you can use them
freely from JVM code.

**Abstract classes** are supported and `@Script` on them is optional. Register
members on the abstract parent and concrete subclasses inherit those
registrations; Godot never learns the abstract type exists. Re-annotate an
overridden member on the child if the child should be exposed differently.

## Properties and the Inspector

```kotlin
@Script
class RotatingCube : Node3D() {
    @Visible var internalCounter: Int = 0     // registered, hidden from the Inspector
    @Export  var speed: Float = 2f            // registered and editable
}
```

- `@Export` requires a core type, a primitive, or a subclass of
  `godot.api.Node` or `godot.api.RefCounted`.
- A property hint (`@IntRange`, `@File`, and friends) already implies
  `@Export`; adding both is redundant. Using a hint on the wrong type fails
  the build.
- An Inspector value overrides the code default after `init` and before
  `_enter_tree`. Never read an exported property from a field initializer, and
  do the work that depends on it in `_ready`.
- Group the Inspector with `@Category`, `@Group` and `@Subgroup` on the
  *first* property of the section. `@Group("Movement")` defaults to the
  `movement` prefix and collects the properties whose names start with it.

Avoid property names that shadow `Node` getters (`tree`, `name`, `position`,
`path`, `parent`, `owner`). It compiles, but `node.tree` then reads as
something other than the `SceneTree` to everyone including you.

## Functions and notifications

`@Register` exposes an ordinary function to Godot, GDScript and the editor.
Recognized Godot overrides (`_ready`, `_process`, `_physicsProcess`, ...) are
picked up in Inferred mode without an annotation.

Two subtleties behind "my function did not register": an accessor-shaped
method (`getFoo`/`setFoo`) is reconstructed as a *property* unless `@Register`
marks it as a function, and only functions declared on the class itself are
selected, not ones merely inherited.

Notifications use an annotation instead of overriding `_notification`:

```kotlin
@Notification(Node.NOTIFICATION_WM_CLOSE_REQUEST)
fun onCloseRequest() { saveGame() }
```

## Signals

Kotlin declares a signal with a delegate. The delegate stores nothing on the
object; it recreates a lightweight wrapper from the owner and the property
name on access.

```kotlin
val died by signal0()
val healthChanged by signal2<Int, Int>()      // current, max
```

Arity runs `signal0()` through `signal16()`. Java and Scala have no delegate
and use `SignalN.create(this, "healthChanged")`; the Kotlin equivalent when
you want an explicit instance is `Signal2<Int, Int>("healthChanged")`, where
the string must match the property name in source spelling. The conversion to
`health_changed` happens for you.

`@Emit` is optional in Inferred mode and only names the arguments for the
Godot side: `@Emit("current", "max")`. In Explicit mode it is what selects the
signal at all.

```kotlin
healthChanged.emit(24, 100)
```

### Payload types

A signal argument crosses into Godot as a Variant, so the declared type has to
be one Godot can carry: a primitive, a core type, an engine class, or one of
your own registered `@Script` classes. Typing a signal on your own registered
`RefCounted` subclass works directly, which is simpler than it used to be.

Two failure modes, and the difference matters when you are debugging:

- An unrelated JVM class fails the build:
  `Registered signal parameter cannot use unrelated JVM class Loot. Only
  Godot-compatible classes can appear in registered signatures.`
- A bare interface, **including a `sealed interface` whose leaves are all
  registered**, passes the build and then throws `NullPointerException` at the
  `connectLambda` call in `_ready`, because the interface has no Variant
  converter of its own.

So keep the exhaustive-`when` ergonomics without typing the wire on the
interface:

```kotlin
// Tool.kt
sealed interface Tool { val label: String }

// Hoe.kt: one @Script class per file
@Script
class Hoe : RefCounted(), Tool {
    override val label = "hoe"
}

// Player.kt
val toolUsed by signal1<RefCounted>()          // registered wire type

fun useTool() = toolUsed.emit(Hoe())

toolUsed.connectLambda { ref -> onTool(ref as Tool) }
fun onTool(tool: Tool) = when (tool) { is Hoe -> ... }   // still exhaustive
```

If a signal only ever carries one leaf type, type it on that class directly
(`signal1<Hoe>()`) and skip the cast. Each `RefCounted` payload allocates, so
for a fixed set of labels with no per-case data a primitive or an enum ordinal
is cheaper and just as clear.

### Connecting

```kotlin
import godot.extension.connectLambda
import godot.extension.connectMethod

override fun _ready() {
    val connector = health.healthChanged.connectLambda { current, max ->
        bar.value = current.toDouble() / max
    }

    animationTree.animationFinished.connectMethod(this, Player::onAnimationFinished)

    connector.isConnected()
    connector.disconnect()
}
```

Both return a `SignalConnector`, a handle you can query and disconnect without
keeping the signal and callable pair around yourself. Neither needs cleanup on
node destruction: Godot drops a connection when either end is freed.

`connectLambda` resolves the payload converters when you connect, which is why
an unconvertible declared type surfaces there and not at emit time.
`connectMethod` builds a named `MethodCallable` instead and converts at call
time, so it is the escape hatch when the lambda path cannot resolve a type.

For a single emission use `signal.await()`, and for a stream use
`signal.asFlow()`; see `coroutines.md`.

## Callables

The typed families `Callable0` through `Callable16` carry their arity and
parameter types, so a mismatch is a compile error rather than a runtime
surprise:

```kotlin
val onHealth = methodCallable2(controller, UiController::onHealthChanged)
val format = lambdaCallable2<String, Int, String> { amount, unit -> "$amount $unit" }

val text = format(24, "HP")
val hp = format.bind("HP")
```

The typeless `Signal`/`Callable` base types with their `emitUnsafe`,
`connectUnsafe` and `callUnsafe` methods behave like GDScript, validating only
at call time. Reach for them only when a value from Godot genuinely has no
known JVM signature.

For built-in engine methods, prefer the pre-made typed method-name fields on
the engine classes (`AnimatedSprite2D.pauseName`) over string lookups. When
you do pass a method name string to `MethodStringNameN`, it must be the
`snake_case` Godot name (`on_health_changed`), unlike `SignalN(...)` which
takes the source-language spelling.

## Attaching scripts and .gdj files

Classes declared in the Godot project are attached through their **source
file**, exactly like a `.gd` script. Godot matches the file to a class by
finding the first `@Script` annotation in it and taking the class declared
right after; when a file has no `@Script` at all, it falls back to a class
whose name equals the file name.

**Keep one attachable script class per file.** With two, the first one wins
the file association silently: the node gets the wrong class, `_ready` never
runs, and nothing is logged. That failure looks exactly like "the binding is
broken", which is why it is worth checking first when a script does nothing.

Other constraints: the file must sit inside both the Godot project and a
configured Gradle source set, and the class information only exists after a
successful build (before that, Godot keeps a placeholder).

`.gdj` files are generated **only for registered classes coming from external
dependencies**, which have no source inside the project. They land in `gdj/`
at the project root by default and are attached like any other script. The
sync step updates and deletes them in step with the dependencies, so treat
them as build output you commit rather than files you edit.

```kotlin
godot {
    godotProjectDirectory.set(file(".."))       // only when Gradle root != Godot root
    registration {
        gdjFilesDirectory.set(file("registrations"))
    }
}
```

## When a rebuild is required

Rebuild after adding, removing, renaming or changing a registered class,
property, signal, or a function Godot calls. Changing only a method body does
not change registration, which is what `./gradlew fastBuild` exploits. After a
successful build the editor reloads the jars by itself, so there is no
separate registration step and no editor restart in either case.
