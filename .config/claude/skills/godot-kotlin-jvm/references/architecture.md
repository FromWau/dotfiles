# Architecture: composition + components (level 2/3 deep dive)

This file is the **escalated** version — the full worked example for
when you've decided the project needs registered Node components,
scene-component instances, or Inspector-tunable per-entity config. It is
**not the default**.

The default for solo, code-first projects is plain Kotlin classes
instantiated in the entity's `_ready()` (level 1) — see SKILL.md's
"Architecture: Kotlin-side patterns" for that shape. The engine-level
composition spectrum (level 0 monolithic → level 3 scene component)
lives in the `godot` skill at `references/composition.md`. Load that
first; this file picks up after the decision to go level 2/3.

The rest of this document describes the level-3 setup (each component
is its own `.tscn` + `@RegisterClass`). Components communicate **only**
with engine-native mechanisms: `@RegisterSignal` signals for discrete
events, plain property reads for state, and direct method calls for
commands. **No coroutines, no `StateFlow`/`SharedFlow`, no
`callbackFlow`** — see SKILL.md's "No coroutines or Flows inside nodes"
for why they're unsafe in godot-kotlin-jvm (weak-referenced object
wrappers + GC-collectible sharing coroutines). Most projects don't need
all of this; pick the pieces that apply.

## When to actually use this

This shape earns its weight when:

- A **designer (not you)** composes new entity scenes by dragging
  components onto base templates.
- Per-entity values (max_hp, speed, damage_multiplier) need
  Inspector tuning *without* recompiling.
- Multiple subsystems (UI HUD + analytics + AI) need to react to the
  same events — that's a signal with several listeners earning its place.
- The project is large enough that the wiring tax pays itself off.

For a solo dev tutoring through a small Godot/Kotlin project with one
or two mob types, the level-1 plain-class shape in SKILL.md is the
better default.

## Project layout (level 3)

Components that could be reused across multiple kinds of entities
(Health, Movement, Animation, Hitbox, …) live in a shared `components/`
package. Each Godot-side component is *two artifacts*:

- a Kotlin class (`HealthComponent.kt`) annotated with `@RegisterClass`,
  extending a `godot.api.*` type, and
- a saved scene (`health_component.tscn`) whose root Node has the
  generated `.gdj` script attached.

The scene is what the editor drags into entity scenes; the script is what
holds the behaviour. Mob scenes (`player.tscn`, `slime.tscn`,
`shop_keeper.tscn`) instance the same component scenes as children and
configure them per-instance via `@Export` properties (max HP, walk speed,
etc.).

Only logic that's intrinsically tied to one specific entity (Player input
mapping, a particular enemy's AI brain, an NPC dialogue graph) lives
under that entity's package. Pure formulas (damage calc, stat tables)
that aren't Nodes live in `domain/`.

```
res://
  components/                  ← reusable component scenes
    health_component.tscn
    movement_component.tscn
    animation_component.tscn
    hurtbox.tscn               (Area2D root)
  entities/
    player.tscn                (CharacterBody2D + the 4 component scenes)
    enemies/
      slime.tscn               (same components, different @Export values)
    npcs/
      shop_keeper.tscn

src/main/kotlin/com/yourgame/
  features/
    inventory/
      InventoryComponent.kt    state + mutators + signals
      InventoryHud.kt          Control node that reads state, reacts to signals
    pause_menu/
      ...
  components/                  ← @RegisterClass Node subclasses
    HealthComponent.kt
    MovementComponent.kt
    AnimationComponent.kt
    Hurtbox.kt
  entities/
    player/
      Player.kt                CharacterBody2D, wires children together
      PlayerInput.kt           bespoke: only the Player has this input mapping
    enemies/
      Slime.kt
      SlimeAi.kt               bespoke: Slime-specific brain
    npcs/
      ShopKeeper.kt
      DialogueBrain.kt         bespoke
  domain/                      pure logic, no godot.* imports
    DamageCalculator.kt        formula, called from inside CombatComponent
    LootTable.kt
    ItemStats.kt
```

**Rule of thumb:** if a second entity might plausibly use this code,
hoist it into `components/` and give it a scene. If it only makes sense
for one entity, keep it next to that entity. Hoisting later is cheap (move
file, create scene, update imports); pre-hoisting things that turn out to
be Player-specific creates abstraction debt.

**Three rules that keep this clean:**

1. `domain/` never imports `godot.*`. It's pure Kotlin, so the JVM test
   suite can run it without a running engine. Damage formulas, item stat
   tables, save serialisers belong here.
2. Components in `components/` are Node subclasses. They don't reach up
   into the scene tree via `getParent()` chains — they receive sibling
   references via the parent's `_ready` wiring (`getNode("HealthComponent")
   as HealthComponent`) or, when designer-tuneable wiring is the point,
   via `@RegisterProperty @Export`. `getNode` is the default; `@Export`
   only when the drag matters. That keeps `HealthComponent` reusable on
   player, enemies, breakable crates, and anything else with hit points.
3. **Avoid `@Export` names that shadow `Node` getters** — `tree`, `name`,
   `position`, `path`, `parent`, `owner`. The Kotlin codegen generates an
   accessor that shadows the engine one with a different return type;
   compiles, but creates `node.tree` / `node.getTree()` confusion across
   plugin versions. Use `animationTree`, `displayName`, `targetPosition`.

## How components talk: signals, reads, calls

Three communication channels, each matched to a kind of information.
None of them involve a coroutine.

- **Discrete event** — "something happened at this instant" (died,
  damaged, tool used, item picked up). → a `@RegisterSignal` the
  component `emit`s; siblings/parents `connect { }` in their `_ready`.
  Fires on every `emit`, so two identical events both notify. Payload must
  be a Variant — a primitive, or a registered `sealed class : RefCounted`
  for a domain type (the examples below use primitives like `Int`; see
  SKILL.md's "Signal payloads" for the `sealed class` standard and why a
  plain `enum` won't even compile as a signal arg).
- **State / derived value** — "what is true right now" (current HP, HP
  fraction, velocity, `isMoving`). → a plain property the consumer reads
  when it needs it. If it drives per-frame visuals, the consumer polls it
  in its own `_process`.
- **Command** — "do this" (damage, heal, move, stop). → a plain method
  call on the component.

A signal connection between two nodes is **automatically disconnected by
the engine when either node is freed** — so unlike a coroutine scope,
there is nothing to clean up in `_exitTree`. That's a direct benefit of
staying on engine-native mechanisms.

## HealthComponent (Node subclass, saved as a scene)

Lives in `components/HealthComponent.kt` with sibling scene
`health_component.tscn` (root Node, script = generated `.gdj`). State is
plain properties; transient events are `@RegisterSignal` signals;
`maxHp` is inspector-configurable.

```kotlin
// components/HealthComponent.kt
import godot.annotation.RegisterClass
import godot.annotation.RegisterFunction
import godot.annotation.RegisterProperty
import godot.annotation.RegisterSignal
import godot.annotation.Export
import godot.api.Node
import godot.core.signal0
import godot.core.signal1
import godot.core.signal2

@RegisterClass
class HealthComponent : Node() {

    @RegisterProperty @Export
    var maxHp: Int = 100

    @RegisterSignal val healthChanged by signal2<Int, Int>()  // hp, maxHp
    @RegisterSignal val damaged by signal1<Int>()             // amount
    @RegisterSignal val died by signal0()

    var hp: Int = 100
        private set

    val isDead: Boolean get() = hp == 0
    val fraction: Float get() = if (maxHp > 0) hp.toFloat() / maxHp else 0f

    @RegisterFunction
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

`hp` is a plain `var` with a private setter — synchronous, no async path,
so two `damage` calls in the same frame can't interleave, and a caller
reading `health.hp` right after `damage(...)` sees the new value
immediately.

**State vs events:** the readable properties (`hp`, `isDead`, `fraction`)
give consumers everything derivable by observation. The signals exist for
the *moments* — `damaged` must fire even when the same amount lands twice
in a frame. A consumer that polled a `var lastDamage` would miss the
second identical hit, because equal values are indistinguishable; a signal
emits each time regardless. That's the whole reason `damaged` is a signal
and not a property.

Consumers pick the channel that fits:

```kotlin
health.healthChanged.connect { hp, max -> bar.value = hp.toDouble() / max }  // HUD
health.died.connect { showGameOver() }                                       // death
val frac = health.fraction                                                   // one-off read
```

### When to switch to sealed actions

For a 1–2 mutator component, `health.damage(10)` says the same thing as
`health.onAction(HealthAction.Damage(10))` with less typing. A sealed
action type starts earning its keep around three or four actions, or as
soon as more than one subsystem (UI + AI + network) dispatches into the
same component:

```kotlin
sealed interface HealthAction {
    data class Damage(val amount: Int) : HealthAction
    data class Heal(val amount: Int) : HealthAction
    data class SetMax(val max: Int) : HealthAction
    data object Revive : HealthAction
}

@RegisterClass
class HealthComponent : Node() {
    // ... properties + signals as above

    fun onAction(action: HealthAction) = when (action) {
        is HealthAction.Damage -> damage(action.amount)
        is HealthAction.Heal   -> heal(action.amount)
        is HealthAction.SetMax -> setMax(action.max)
        HealthAction.Revive    -> revive()
    }
    // private handlers mutate hp and emit the matching signals
}
```

`onAction` is a single `when` that fans out directly into the concrete
handlers. The `when` *is* the dispatch — no extra `reduce` indirection.
You can also call the handlers directly without constructing an action.
The migration from methods to actions doesn't change the consumer side
(the same properties and signals stay), so defer it until the component
actually grows.

## MovementComponent (Node, drives its parent CharacterBody2D)

Lives in `components/MovementComponent.kt` with `movement_component.tscn`.
Takes a `Vector2` direction so an AI-controlled enemy can reuse the same
component by feeding in a computed direction instead of player input. The
*parent* CharacterBody2D is fetched via `getParent()` typed cast — this
component only makes sense as a direct child of one — and `speed` is
exported per instance. `isMoving` is a plain read for the animation
component to poll.

```kotlin
// components/MovementComponent.kt
@RegisterClass
class MovementComponent : Node() {

    @RegisterProperty @Export
    var speed: Float = 220f

    private var body: CharacterBody2D? = null

    var isMoving: Boolean = false
        private set

    @RegisterFunction
    override fun _ready() {
        body = getParent() as? CharacterBody2D
            ?: error("MovementComponent must be a child of a CharacterBody2D")
    }

    fun move(direction: Vector2) {
        val b = body ?: return
        b.velocity = direction.normalized() * speed.toDouble()
        b.moveAndSlide()
        isMoving = b.velocity != Vector2.ZERO
    }

    fun stop() {
        body?.velocity = Vector2.ZERO
        isMoving = false
    }
}
```

`getParent()` is the one place where coupling to "this node has a
specific parent type" is acceptable — it's the whole point of a movement
component. For sibling components, the default is `getNode("HealthComponent")
as HealthComponent` in the parent's `_ready` (refactor-tracked by
IDE/`grep`, breaks loudly on node rename); reach for `@RegisterProperty
@Export` only when the wire genuinely benefits from being a designer-set
drag in the Inspector. Examples below show `@Export` because this file
is the level-3 deep dive — substitute `getNode` for the default code-first
case.

## DamageCalculator (pure Kotlin, lives in `domain/`)

Not every "component" needs to be a Node. A pure formula belongs in
`domain/` — no `@RegisterClass`, no `godot.*` imports, JVM-testable
without an engine running. The naming reflects what it actually is: a
calculator, not a scene-attachable behaviour.

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

A `CombatComponent` (Node) calls this from inside its `applyHit(...)` and
announces the result with its own signal:

```kotlin
// components/CombatComponent.kt
@RegisterClass
class CombatComponent : Node() {

    @RegisterProperty @Export lateinit var health: HealthComponent

    @RegisterSignal val hit by signal1<Int>()   // actual damage dealt

    fun applyHit(rawDamage: Int, defense: DefenseStats) {
        val actual = DamageCalculator.calc(rawDamage, defense)
        health.damage(actual)
        hit.emit(actual)
    }
}
```

A signal fires on every `emit`, so two identical `hit(10)` events both
reach the listener — exactly what hit feedback needs. (A polled
`var lastHit = 10` would be indistinguishable across the two hits and the
second damage number would never show.)

## AnimationComponent (Node, reads siblings + reacts to their signals)

Lives in `components/AnimationComponent.kt` with `animation_component.tscn`.
It uses **both** channels, matched to the kind of information:

- locomotion (idle/walk) is continuous *state*, so it **polls**
  `movement.isMoving` in `_process`;
- hurt/death are discrete *events*, so it **connects** to
  HealthComponent's signals once in `_ready`.

Sibling references come from the inspector (drag the child nodes onto the
`@Export` fields in the entity scene).

```kotlin
// components/AnimationComponent.kt
@RegisterClass
class AnimationComponent : Node() {

    @RegisterProperty @Export lateinit var sprite: AnimatedSprite2D
    @RegisterProperty @Export lateinit var movement: MovementComponent
    @RegisterProperty @Export lateinit var health: HealthComponent

    private var current = ""

    @RegisterFunction
    override fun _ready() {
        // one-shot reactions: connect to the discrete events
        health.damaged.connect { _ -> playOnce("hurt") }
        health.died.connect { playOnce("death") }
    }

    @RegisterFunction
    override fun _process(delta: Double) {
        if (health.isDead) return
        // locomotion is continuous state — poll it
        val next = if (movement.isMoving) "walk" else "idle"
        if (next != current) {
            current = next
            sprite.play(next)
        }
    }

    private fun playOnce(name: String) {
        sprite.play(name)
        current = ""   // force _process to re-apply locomotion next frame
    }
}
```

The hurt-flash uses the `damaged` signal, not a polled value — repeated
equal-damage hits each flash, which a state read would miss. `current`
tracks the last locomotion animation so `_process` only calls `play` on a
real change; `playOnce` resets it so locomotion resumes after the one-shot.
No coroutine, no scope, nothing to cancel.

## Player (the parent Node that holds the components)

Lives in `entities/player/Player.kt` with `entities/player.tscn`. The
Player scene has the four component scenes instanced as children. The
Kotlin class declares `@Export` references; in the editor, drag each
child Node onto the matching field on the Player node.

```kotlin
// entities/player/Player.kt
@RegisterClass
class Player : CharacterBody2D() {

    @RegisterProperty @Export lateinit var health: HealthComponent
    @RegisterProperty @Export lateinit var movement: MovementComponent
    @RegisterProperty @Export lateinit var animation: AnimationComponent
    @RegisterProperty @Export lateinit var combat: CombatComponent

    @RegisterFunction
    override fun _ready() {
        health.died.connect { movement.stop() }
    }

    @RegisterFunction
    override fun _physicsProcess(delta: Double) {
        if (!health.isDead) {
            val input = Input.getVector("move_left", "move_right", "move_up", "move_down")
            movement.move(input)
        }
    }

    fun gotHit(rawDamage: Int, attackerDefenseBreak: Int = 0) {
        val defense = DefenseStats(armor = 5 - attackerDefenseBreak, resistance = 0.1f)
        combat.applyHit(rawDamage, defense)
    }
}
```

Note what Player *doesn't* do: no `HealthComponent(initial = 100)`
construction, no `getNodeAs<AnimatedSprite2D>(...)`, **and no `NodeScope`
to create and cancel**. Instances and wiring live in the scene; the script
declares what it needs and uses what the inspector handed it. The single
`health.died.connect { }` reaction needs no `_exitTree` cleanup — the
engine drops the connection when either node frees.

`gotHit` is a thin shim delegating to CombatComponent. The animation flash
happens automatically because AnimationComponent already connected to
`health.damaged` in its own `_ready` — no manual fan-out.

## Reusing the same components on an enemy

Because none of `HealthComponent`, `MovementComponent`, `AnimationComponent`,
or `CombatComponent` know anything about the Player, an enemy scene
composes the exact same set of component scenes and tunes them via the
inspector. Different `max_hp`, different `speed`, different sprite, same
component scripts.

```kotlin
// entities/enemies/Slime.kt
@RegisterClass
class Slime : CharacterBody2D() {

    @RegisterProperty @Export lateinit var health: HealthComponent
    @RegisterProperty @Export lateinit var movement: MovementComponent
    @RegisterProperty @Export lateinit var animation: AnimationComponent
    @RegisterProperty @Export lateinit var ai: SlimeAi  // bespoke

    @RegisterFunction
    override fun _physicsProcess(delta: Double) {
        if (!health.isDead) {
            movement.move(ai.desiredDirection())
        }
    }
}
```

`SlimeAi` lives in `entities/enemies/` because it's specific to this
enemy. If a second enemy ends up wanting the same brain, hoist it into
`components/` and give it a scene at that point.

In the editor: `slime.tscn` instances `health_component.tscn` and sets
`max_hp = 30`; instances `movement_component.tscn` and sets `speed = 60`;
adds a `SlimeAi` child. Drag the children onto Slime's `@Export` fields.
No Kotlin-side changes for new enemy variants.

## Connecting to built-in signals (Area2D, Button, …)

Built-in Godot signals on nodes (`bodyEntered`, `pressed`, `timeout`, …)
are exposed as signal properties on the binding. Connect them with the
trailing-lambda `.connect { }` in `_ready` — same `import godot.core.connect`
that custom signals use. No `callbackFlow`, no scope; the engine
disconnects automatically when the node frees.

```kotlin
import godot.core.connect

@RegisterClass
class TriggerZone : Area2D() {

    @RegisterFunction
    override fun _ready() {
        bodyEntered.connect { body -> onBodyEntered(body) }
    }

    private fun onBodyEntered(body: Node2D) {
        val player = body as? Player ?: return   // plain cast, not filterIsInstance
        // ...
    }
}
```

If the zone needs to *broadcast* the entry to other systems, re-emit it
as its own `@RegisterSignal` (`val playerEntered by signal1<Player>()`)
and let any number of listeners `connect`. Multiple listeners on one
signal is the engine-native "one-to-many" — it's what `SharedFlow` was
standing in for, without the GC hazard.

### Binding-version caveats

The connect surface varies between plugin versions — check the generated
source if something doesn't compile:

- **`.connect { }` lambda overload (0.14.x)** requires
  `import godot.core.connect`. Without it only the base
  `connect(Callable, Int)` is in scope and the trailing lambda won't
  resolve — the #1 gotcha. In **0.16.x** the typed form is
  `connect(target, Class::method, flags)` with a member reference and an
  explicit `Int` flag (see SKILL.md's per-version connect sections).
- **Signal property names** are camelCase on the Kotlin side
  (`bodyEntered`, `inputEvent`), generated from Godot's snake_case
  (`body_entered`, `input_event`). A custom `@RegisterSignal val
  toolUse` registers as `tool_use`.
- **Payloads are Variants.** Built-in signal args are already Variant
  types. For custom signals, never pass a Kotlin `enum` — send `.name` /
  `.ordinal` and map back (see SKILL.md's `@RegisterSignal` section).

## Code wiring vs editor wiring

Two refactor failure modes you trade between:

- **Code wiring** (`getNode("HealthComponent") as HealthComponent` in
  `_ready`). Tracked by IDE / `grep` / *Find Usages* through file
  renames, class refactors, package moves. Breaks loudly on **node**
  renames in the editor: runtime cast/NPE pointing at the line.
- **Editor wiring** (`@RegisterProperty @Export lateinit var health:
  HealthComponent`, dragged in the Inspector). The `NodePath` blob
  inside `.tscn` updates automatically when nodes are renamed or moved
  inside the editor. Breaks silently on file / class refactors — the
  scene still parses, but the export slot loses its association and the
  field is null at runtime.

**For solo, code-first work**, default to code wiring. File/class
refactors happen more often than node-tree restructuring, and the
failure mode (loud cast crash on a wrong path) is easier to debug than
a silent `lateinit` access.

**For team work with a level designer**, editor wiring may win — the
designer composes the scene by drag-drop and needs the export slot. If
the same scene is regularly edited by both Kotlin and the editor by
different people, you genuinely need the editor refs.

For signal connections (`bodyEntered.connect { }`, `health.died.connect
{ }`), code wiring in `_ready` is the universal default regardless of the
rest. The connection is behaviour, not scene arrangement, and the
`.tscn`-serialised signal connections from the editor's right-click menu
are the worst of both worlds (silent on method rename, invisible to
`grep`).
