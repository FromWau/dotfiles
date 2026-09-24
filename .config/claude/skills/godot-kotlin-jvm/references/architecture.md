# Architecture: composing a game in JVM code

The engine-level composition story (the spectrum from one monolithic script to
scene-instanced components, "Call Down Signal Up", mechanism versus content)
lives in the `godot` skill at `references/composition.md`. Read that first.
This file is the JVM-side application of it.

## Default to plain classes

Most behaviour does not need to be a node. A plain Kotlin class in a
`components/` package, instantiated by the entity controller in `_ready`, has
no annotation, no `.gdj`, no scene, and no registration cost.

```kotlin
// components/Movement.kt
package components

import godot.api.CharacterBody2D
import godot.core.Vector2

class Movement(private val speed: Float) {
    var isMoving: Boolean = false
        private set

    fun move(body: CharacterBody2D, direction: Vector2) {
        body.velocity = direction.normalized() * speed.toDouble()
        body.moveAndSlide()
        isMoving = body.velocity != Vector2.ZERO
    }
}
```

```kotlin
// entities/Player.kt
@Script
class Player : CharacterBody2D() {
    private val movement = Movement(speed = 220f)
    private lateinit var animation: HumanoidAnimation

    override fun _ready() {
        animation = HumanoidAnimation(getNodeAs("Animation/AnimationTree")!!)
    }

    override fun _physicsProcess(delta: Double) {
        val direction = Input.getVector("left", "right", "up", "down")
        movement.move(this, direction)
        animation.apply(direction, movement.isMoving)
    }
}
```

An enemy reuses the same classes with its own numbers. That is reuse at the
class level, with no scene wiring to maintain.

Promote a plain class to a `@Script` node subclass only when something
concrete demands it:

- per-entity values need Inspector tuning without recompiling (`@Export`),
- the component owns engine lifecycle of its own (a hurtbox rooted on an
  `Area2D` reacting to its own `bodyEntered`, a component driving its own
  `_process`),
- someone who does not write JVM code composes entities by dragging
  components.

If none of those hold, staying with plain classes keeps the build faster and
the scene tree smaller. Most solo, code-first projects never escalate.

## Keep pure logic engine-free

Damage formulas, loot tables, save serialization, stat math: plain classes in
`domain/`, with no `godot.*` import anywhere in the package. That package is
testable on the JVM without launching an engine, which is the whole point.

```kotlin
// domain/DamageCalculator.kt
data class DefenseStats(val armor: Int, val resistance: Float)

object DamageCalculator {
    fun calc(rawDamage: Int, defense: DefenseStats): Int {
        val afterArmor = (rawDamage - defense.armor).coerceAtLeast(1)
        return (afterArmor * (1f - defense.resistance)).toInt().coerceAtLeast(1)
    }
}
```

The line to hold: *does this need to be in the scene tree?* Yes means
`@Script`. No means a plain class.

## Four channels, matched to the kind of information

| Information | Channel |
|---|---|
| Something happened at this instant (died, damaged, item picked up) | a signal you `emit` |
| What is true right now (current HP, velocity, `isMoving`) | a plain property the consumer reads |
| Do this (damage, heal, stop) | a plain method call |
| A sequence of dependent waits (spawn a wave, wait, reward) | a coroutine started with `Node.launch` |

The first three are synchronous and need no cleanup: Godot drops a signal
connection when either end is freed. The fourth is safe for the same kind of
reason, as long as it is node-owned: the binding cancels a node's scope when
the node leaves the tree. A scope you build and share by hand is the thing to
avoid, because then the lifetime is yours to get wrong. See `coroutines.md`.

Choosing between a signal and a property read is not a style question. A
property is *observable state*: reading it twice gives the same answer, and two
identical events in one frame are indistinguishable. A signal *fires per
occurrence*, so two hits for the same amount both reach the listener. Hit
feedback needs the signal; a health bar is happy polling the property.

## A component, worked

```kotlin
// components/HealthComponent.kt
import godot.annotation.Export
import godot.annotation.Script
import godot.api.Node
import godot.core.signal0
import godot.core.signal1
import godot.core.signal2

@Script
class HealthComponent : Node() {

    @Export var maxHp: Int = 100

    val healthChanged by signal2<Int, Int>()   // hp, maxHp
    val damaged by signal1<Int>()              // amount
    val died by signal0()

    var hp: Int = 100
        private set

    val isDead: Boolean get() = hp == 0
    val fraction: Float get() = if (maxHp > 0) hp.toFloat() / maxHp else 0f

    override fun _ready() {
        hp = maxHp
        healthChanged.emit(hp, maxHp)
    }

    fun damage(amount: Int) {
        if (amount <= 0 || isDead) return
        hp = (hp - amount).coerceAtLeast(0)
        healthChanged.emit(hp, maxHp)
        damaged.emit(amount)
        if (isDead) died.emit()
    }

    fun heal(amount: Int) {
        if (amount <= 0 || isDead) return
        hp = (hp + amount).coerceAtMost(maxHp)
        healthChanged.emit(hp, maxHp)
    }
}
```

Note what is *not* there: no annotation on `_ready` (Inferred mode recognizes
the override), no annotation on the signals (a `SignalN` member is selected on
its own; `@Emit("current", "max")` would only name the arguments), and no
constructor ceremony (a class without a public no-arg constructor still
registers; this one has the implicit one anyway).

Consumers pick their channel:

```kotlin
health.healthChanged.connectLambda { hp, max -> bar.value = hp.toDouble() / max }
health.died.connectLambda { showGameOver() }
val frac = health.fraction
health.damage(12)
```

### When to switch to sealed actions

For one or two mutators, `health.damage(10)` beats
`health.onAction(HealthAction.Damage(10))`. A sealed action type starts paying
for itself around three or four actions, or as soon as more than one subsystem
dispatches into the same component:

```kotlin
sealed interface HealthAction {
    data class Damage(val amount: Int) : HealthAction
    data class Heal(val amount: Int) : HealthAction
    data object Revive : HealthAction
}

fun onAction(action: HealthAction) = when (action) {
    is HealthAction.Damage -> damage(action.amount)
    is HealthAction.Heal -> heal(action.amount)
    HealthAction.Revive -> revive()
}
```

The `when` is the dispatch; there is no reducer layer under it. Consumers keep
reading the same properties and signals, so this migration is invisible to
them, which is exactly why you can defer it.

Note that a sealed hierarchy used this way lives entirely on the JVM side. The
moment you want to send one *through a signal*, the payload rules in
`registration.md` apply: type the signal on a registered class or `RefCounted`,
never on the interface.

## Wiring: code or Inspector

Two failure modes, and you are choosing which one you would rather debug.

- **Code wiring**, `getNodeAs<HealthComponent>("HealthComponent")` in
  `_ready`. Survives file renames, class renames and package moves, because
  the IDE and `grep` track it. Breaks loudly on a *node* rename: a cast or
  null failure pointing at the line.
- **Inspector wiring**, `@Export lateinit var health: HealthComponent`
  dragged in the editor. Survives node renames and moves, because the scene
  stores a `NodePath` the editor updates. Breaks quietly on file or class
  refactors: the scene still parses and the field is simply unset.

For solo, code-first work prefer code wiring: refactors happen more often than
tree restructuring, and a loud crash is cheaper than a silent unset field.
Reserve `@Export` for values a human tunes per instance (`maxHp`, `speed`) and
for wiring a designer is meant to do by hand.

Signal connections are behaviour, not scene arrangement, so connect them in
`_ready` regardless of the above. The editor's Connect dialog serializes a
method name into the `.tscn`, which is invisible to `grep` and silent when the
method is renamed.

Avoid property names that shadow `Node` getters (`tree`, `name`, `position`,
`path`, `parent`, `owner`). The generated accessor compiles, and then
`node.tree` no longer means what every reader assumes.

## Layout that scales

```
src/main/kotlin/com/yourgame/
  domain/            pure logic, no godot.* imports, JVM-testable
  components/        reusable behaviour: Movement, HumanoidAnimation, HealthComponent
  entities/
    player/          Player.kt plus what only the player has (PlayerInput)
    enemies/         Slime.kt, SlimeAi.kt
  ui/                HUD, menus
```

The rule of thumb: if a second entity might plausibly use it, it belongs in
`components/`. If it only makes sense for one entity, keep it next to that
entity and hoist later. Hoisting is a file move; pre-hoisting something that
turns out to be player-specific is abstraction debt you pay every time you
read it.

One `@Script` class per file is not a style preference here, it is a hard
requirement of how Godot resolves a source file to a class. See
`registration.md`.
