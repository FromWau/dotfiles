# Architecture: composition + components (level 2/3 deep dive)

This file is the **escalated** version — the full worked example for
when you've decided the project needs registered Node components,
scene-component instances, Inspector-tunable per-entity config, or
cross-system observation via Coroutines/StateFlow. It is **not the
default**.

The default for solo, code-first projects is plain Kotlin classes
instantiated in the entity's `_ready()` (level 1) — see SKILL.md's
"Architecture: Kotlin-side patterns" for that shape. The engine-level
composition spectrum (level 0 monolithic → level 3 scene component)
lives in the `godot` skill at `references/composition.md`. Load that
first; this file picks up after the decision to go level 2/3.

The rest of this document describes the level-3 setup (each component
is its own `.tscn` + `@RegisterClass`), with Coroutines/StateFlow for
cross-system observation. Most projects don't need all of this. Pick
the pieces that apply.

## When to actually use this

This shape earns its weight when:

- A **designer (not you)** composes new entity scenes by dragging
  components onto base templates.
- Per-entity values (max_hp, speed, damage_multiplier) need
  Inspector tuning *without* recompiling.
- Multiple subsystems (UI HUD + analytics + AI) need to observe the
  same state changes — that's a StateFlow earning its place.
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
  core/
    coroutines/                NodeScope helper
    signals/                   callbackFlow wrappers for common signals
  state/
    GameStore.kt               MVI store for game-wide state
    GameState.kt
    GameIntent.kt
  features/
    inventory/
      InventoryStore.kt        MVI: state + intent + reducer
      InventoryHud.kt          Control node that renders state, emits intents
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

## NodeScope helper

Nodes don't ship a `CoroutineScope`. Create one tied to the node's
lifetime and cancel it in `_exitTree`, otherwise collectors leak when the
node is freed.

```kotlin
// core/coroutines/NodeScope.kt
class NodeScope : CoroutineScope {
    override val coroutineContext = SupervisorJob() + Dispatchers.Main
    fun cancel() { coroutineContext.cancel() }
}
```

`Dispatchers.Main` here means the dispatcher that posts work back to
Godot's main thread. Touching node APIs from a background thread will
crash the engine, so any `collect` that ends up calling into a Node must
run on Main.

## HealthComponent (Node subclass, saved as a scene)

Lives in `components/HealthComponent.kt` with sibling scene
`health_component.tscn` (root Node, script = generated `.gdj`). Bundled
state via a single `StateFlow`, transient hit events via a `SharedFlow`,
inspector-configurable `maxHp`.

```kotlin
// components/HealthComponent.kt
@RegisterClass
class HealthComponent : Node() {

    @RegisterProperty @Export
    var maxHp: Int = 100

    private val _state = MutableStateFlow(HealthState(hp = 100, maxHp = 100))
    val state: StateFlow<HealthState> = _state.asStateFlow()

    private val _damaged = MutableSharedFlow<Int>(extraBufferCapacity = 16)
    val damaged: SharedFlow<Int> = _damaged.asSharedFlow()

    @RegisterFunction
    override fun _ready() {
        _state.value = HealthState(hp = maxHp, maxHp = maxHp)
    }

    fun damage(amount: Int) {
        if (amount <= 0 || _state.value.isDead) return
        _state.update { it.copy(hp = (it.hp - amount).coerceAtLeast(0)) }
        _damaged.tryEmit(amount)
    }

    fun heal(amount: Int) {
        if (amount <= 0 || _state.value.isDead) return
        _state.update { it.copy(hp = (it.hp + amount).coerceAtMost(it.maxHp)) }
    }
}

data class HealthState(val hp: Int, val maxHp: Int) {
    val isDead: Boolean get() = hp == 0
    val fraction: Float get() = if (maxHp > 0) hp.toFloat() / maxHp else 0f
}
```

`HealthState` stays a pure data class — atomic snapshot of all related
fields. `_state.update { }` is synchronous and atomic; don't wrap in
`scope.launch` unless something genuinely suspends, otherwise two damage
calls in the same frame can race and a caller reading `state.value`
right after `damage(...)` will see the old value.

**State vs events:** the state Flow gives consumers everything derivable
by observation (current HP, fraction, isDead). The `damaged` SharedFlow
exists because a transient hit event needs to fire even when the value
repeats — state diffing on HP would miss a second 10-damage hit landing
on the same frame as the first. SharedFlow doesn't diff.

Consumers derive what they need from the one state Flow:

```kotlin
health.state.map { it.fraction }                           // HUD bar
health.state.map { it.isDead }.distinctUntilChanged()      // death trigger
```

### When to switch to sealed actions

For a 1–2 mutator component, `health.damage(10)` says the same thing as
`health.onAction(HealthAction.Damage(10))` with less typing and the same
testability. A sealed action type starts earning its keep around three or
four actions, or as soon as more than one subsystem (UI + AI + network)
dispatches into the same component:

```kotlin
sealed interface HealthAction {
    data class Damage(val amount: Int) : HealthAction
    data class Heal(val amount: Int) : HealthAction
    data class SetMax(val max: Int) : HealthAction
    data object Revive : HealthAction
}

@RegisterClass
class HealthComponent : Node() {
    val state: StateFlow<HealthState> = ...

    fun onAction(action: HealthAction) = when (action) {
        is HealthAction.Damage -> handleDamage(action.amount)
        is HealthAction.Heal   -> handleHeal(action.amount)
        is HealthAction.SetMax -> handleSetMax(action.max)
        HealthAction.Revive    -> handleRevive()
    }

    private fun handleDamage(amount: Int) = _state.update {
        if (it.isDead) it else it.copy(hp = (it.hp - amount).coerceAtLeast(0))
    }
    // ...
}
```

`onAction` is a single `when` that fans out directly into the concrete
handlers. The `when` *is* the dispatch — no extra `reduce` indirection.
Each handler stays small and individually readable, and you can call them
directly from inside the class without constructing an action just to
route through `onAction`.

The migration from methods to actions doesn't change the consumer side
(state Flow stays identical), so it's safe to defer until the component
actually grows.

## MovementComponent (Node, drives its parent CharacterBody2D)

Lives in `components/MovementComponent.kt` with `movement_component.tscn`.
Takes a `Vector2` direction so an AI-controlled enemy can reuse the same
component by feeding in a computed direction instead of player input. The
*parent* CharacterBody2D is fetched via `getParent()` typed cast — this
component only makes sense as a direct child of one — and `speed` is
exported per instance.

```kotlin
// components/MovementComponent.kt
@RegisterClass
class MovementComponent : Node() {

    @RegisterProperty @Export
    var speed: Float = 220f

    private var body: CharacterBody2D? = null

    private val _velocity = MutableStateFlow(Vector2.ZERO)
    val velocity: StateFlow<Vector2> = _velocity.asStateFlow()

    @RegisterFunction
    override fun _ready() {
        body = getParent() as? CharacterBody2D
            ?: error("MovementComponent must be a child of a CharacterBody2D")
    }

    fun move(direction: Vector2) {
        val b = body ?: return
        b.velocity = direction.normalized() * speed.toDouble()
        b.moveAndSlide()
        _velocity.value = b.velocity
    }

    fun stop() {
        body?.velocity = Vector2.ZERO
        _velocity.value = Vector2.ZERO
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
broadcasts the result through its own `SharedFlow`:

```kotlin
// components/CombatComponent.kt
@RegisterClass
class CombatComponent : Node() {

    @RegisterProperty @Export lateinit var health: HealthComponent

    private val _events = MutableSharedFlow<DamageEvent>(extraBufferCapacity = 16)
    val events: SharedFlow<DamageEvent> = _events.asSharedFlow()

    fun applyHit(rawDamage: Int, defense: DefenseStats) {
        val actual = DamageCalculator.calc(rawDamage, defense)
        health.damage(actual)
        _events.tryEmit(DamageEvent(amount = actual))
    }
}

data class DamageEvent(val amount: Int)
```

`SharedFlow` is the right primitive precisely because two identical
`DamageEvent(amount = 10)` emissions stay distinct. A `StateFlow` would
collapse them via `distinctUntilChanged` semantics and the second damage
number would never show up.

## AnimationComponent (Node, subscribes to sibling Flows)

Lives in `components/AnimationComponent.kt` with `animation_component.tscn`.
Subscribes once in `_ready`. Nothing per-frame; the animation reacts to
state changes published by sibling components. Sibling references come
from the inspector (drag the HealthComponent and MovementComponent child
nodes onto the `@Export` fields of the AnimationComponent in the entity
scene).

```kotlin
// components/AnimationComponent.kt
@RegisterClass
class AnimationComponent : Node() {

    @RegisterProperty @Export lateinit var sprite: AnimatedSprite2D
    @RegisterProperty @Export lateinit var movement: MovementComponent
    @RegisterProperty @Export lateinit var health: HealthComponent

    private val scope = NodeScope()

    @RegisterFunction
    override fun _ready() {
        movement.velocity
            .map { if (it == Vector2.ZERO) "idle" else "walk" }
            .distinctUntilChanged()
            .onEach { sprite.play(it) }
            .launchIn(scope)

        health.state
            .map { it.isDead }
            .distinctUntilChanged()
            .filter { it }
            .onEach { sprite.play("death") }
            .launchIn(scope)

        scope.launch {
            health.damaged.collect { sprite.play("hurt") }
        }
    }

    @RegisterFunction
    override fun _exitTree() { scope.cancel() }
}
```

The hit-flash listener uses the `damaged` SharedFlow on HealthComponent,
not the state Flow — exactly the case where state diffing would miss
repeated values.

## Player (the parent Node that holds the components)

Lives in `entities/player/Player.kt` with `entities/player.tscn`. The
Player scene has the four component scenes (HealthComponent,
MovementComponent, AnimationComponent, CombatComponent) instanced as
children. The Kotlin class declares `@Export` references; in the editor,
drag each child Node onto the matching field on the Player node.

```kotlin
// entities/player/Player.kt
@RegisterClass
class Player : CharacterBody2D() {

    @RegisterProperty @Export lateinit var health: HealthComponent
    @RegisterProperty @Export lateinit var movement: MovementComponent
    @RegisterProperty @Export lateinit var animation: AnimationComponent
    @RegisterProperty @Export lateinit var combat: CombatComponent

    private val scope = NodeScope()

    @RegisterFunction
    override fun _ready() {
        scope.launch {
            health.state
                .map { it.isDead }
                .distinctUntilChanged()
                .filter { it }
                .collect { movement.stop() }
        }
    }

    @RegisterFunction
    override fun _physicsProcess(delta: Double) {
        if (!health.state.value.isDead) {
            val input = Input.getVector("move_left", "move_right", "move_up", "move_down")
            movement.move(input)
        }
    }

    @RegisterFunction
    override fun _exitTree() { scope.cancel() }

    fun gotHit(rawDamage: Int, attackerDefenseBreak: Int = 0) {
        val defense = DefenseStats(armor = 5 - attackerDefenseBreak, resistance = 0.1f)
        combat.applyHit(rawDamage, defense)
    }
}
```

Note what Player *doesn't* do anymore: no `HealthComponent(initial = 100)`
construction, no `getNodeAs<AnimatedSprite2D>(...)`. Instances and wiring
live in the scene; the script just declares what it needs and uses what
the inspector handed it. This is the payoff of the component-as-scene
pattern — the Kotlin code stops being a DI container.

`gotHit` is now a thin shim that delegates to CombatComponent. The
animation flash happens automatically because AnimationComponent already
subscribed to `health.damaged` in its own `_ready`. No manual fan-out
required.

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

    private val scope = NodeScope()

    @RegisterFunction
    override fun _physicsProcess(delta: Double) {
        if (!health.state.value.isDead) {
            movement.move(ai.desiredDirection())
        }
    }

    @RegisterFunction
    override fun _exitTree() { scope.cancel() }
}
```

`SlimeAi` lives in `entities/enemies/` because it's specific to this
enemy. If a second enemy ends up wanting the same brain, hoist it into
`components/` and give it a scene at that point.

In the editor: `slime.tscn` instances `health_component.tscn` and sets
`max_hp = 30`; instances `movement_component.tscn` and sets `speed = 60`;
adds a `SlimeAi` child. Drag the children onto Slime's `@Export` fields.
No Kotlin-side changes for new enemy variants.

## Signals to Flows: full pattern

Built-in Godot signals on nodes are exposed as signal properties in the
Kotlin binding. Wrapping them with `callbackFlow` gives a Flow whose
collection lifecycle drives the connect/disconnect, so you never end up
double-subscribed or leaking after the collector cancels.

```kotlin
@RegisterClass
class TriggerZone : Area2D() {

    private val scope = NodeScope()

    val playerEntered: Flow<Player> = callbackFlow {
        val callable = Callable { body: Node2D -> trySend(body) }
        bodyEntered.connect(callable)
        awaitClose { bodyEntered.disconnect(callable) }
    }
        .filterIsInstance<Player>()
        .shareIn(scope, SharingStarted.WhileSubscribed())

    @RegisterFunction
    override fun _ready() {
        playerEntered
            .onEach { onPlayerEnter(it) }
            .launchIn(scope)
    }

    @RegisterFunction
    override fun _exitTree() { scope.cancel() }

    private fun onPlayerEnter(player: Player) {
        // ...
    }
}
```

`shareIn` is optional. Use it when more than one collector should observe
the same stream without each one re-subscribing to the underlying signal.
For a single consumer, skip it and expose the raw `callbackFlow`.

### Binding-version caveats

The following surfaces vary between plugin versions, so check the
generated source if something below doesn't compile:

- **Building a `Callable` from a lambda.** Some versions expose a
  `Callable { ... }` lambda constructor as shown above; others want
  `Callable(target, methodName)` with a `@RegisterFunction` on the target
  method. Check `godot.core.Callable` in your binding.
- **Signal property names.** Almost always camelCase
  (`bodyEntered`, `inputEvent`), generated from Godot's snake_case
  (`body_entered`, `input_event`). Confirm by hovering the property in
  your IDE.
- **connect / disconnect surface.** Either methods on the signal property
  (`bodyEntered.connect(callable)`) or a `connect(signalName, callable)`
  method on the Node. The `callbackFlow` pattern doesn't care which.

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

For signal connections (`bodyEntered.connect(...)`,
`died.connect(::onDied)`), code wiring in `_ready` is the universal
default regardless of the rest. The connection is behaviour, not scene
arrangement, and the `.tscn`-serialised signal connections from the
editor's right-click menu are the worst of both worlds (silent on
method rename, invisible to `grep`).
