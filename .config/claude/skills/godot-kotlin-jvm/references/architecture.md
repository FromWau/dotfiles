# Architecture: composition + components

Full worked example of the architectural patterns described in `SKILL.md`'s
"Architecture: composition + components" and "Signals: connecting from
Kotlin" sections. This is reference material — read it when you're laying
out a new gameplay system, picking a component shape, or wiring engine
signals into Kotlin code.

## Project layout

Components that could be reused across multiple kinds of entities (Health,
Movement, Animation, Damage, Hitbox, ...) live in a shared `components/`
package. Only logic that's intrinsically tied to one specific entity
(Player input mapping, a particular enemy's AI brain, an NPC's dialogue
graph) lives under that entity's package.

```
src/main/kotlin/com/yourgame/
  core/
    coroutines/        scopes (NodeScope helper)
    signals/           callbackFlow wrappers for common Godot signals
  state/
    GameStore.kt       MVI store for game-wide state (run, save, settings)
    GameState.kt
    GameIntent.kt
  features/
    inventory/
      InventoryStore.kt    MVI: state + intent + reducer
      InventoryHud.kt      Control node that renders state and emits intents
    pause_menu/
      ...
  components/          ← reusable across entities
    HealthComponent.kt
    MovementComponent.kt
    AnimationComponent.kt
    DamageComponent.kt
    Hitbox.kt
  entities/
    player/
      Player.kt            CharacterBody2D, composes shared + bespoke
      PlayerInput.kt       bespoke: only the Player has this input mapping
    enemies/
      Slime.kt
      SlimeAi.kt           bespoke: Slime-specific brain
    npcs/
      ShopKeeper.kt
      DialogueBrain.kt     bespoke
  world/
    levels/                scenes + per-level glue
    triggers/
  domain/                  pure logic, no godot.* imports
```

The rule of thumb: if a second entity might plausibly use this code,
hoist it into `components/`. If it only makes sense for one entity,
keep it next to that entity. Hoisting later is cheap (move file, update
imports); pre-hoisting things that turn out to be Player-specific creates
abstraction debt.

Two rules that keep this clean:

1. `domain/` never imports `godot.*`. It's pure Kotlin, so the JVM test
   suite can run it without a running engine.
2. Components are constructed by the owning Node, handed whatever they
   need via constructor (often a `CoroutineScope`, a node reference, and a
   few Flows), and never reach back up into the scene tree. That keeps
   `HealthComponent` reusable on player, enemies, breakable crates, and
   anything else with hit points, without inheritance.

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

## HealthComponent (pure, no Godot imports)

Lives in `components/`. Bundled state via a single `StateFlow`, direct
methods for input. No Godot types are touched, so this class can be
unit-tested on the plain JVM and reused on any entity that has hit points.

```kotlin
// components/HealthComponent.kt
data class HealthState(val current: Int, val max: Int) {
    val isDead: Boolean get() = current <= 0
    val fraction: Float get() = current.toFloat() / max
}

class HealthComponent(
    initial: Int,
    max: Int = initial,
) {
    private val _state = MutableStateFlow(HealthState(current = initial, max = max))
    val state: StateFlow<HealthState> = _state.asStateFlow()

    fun damage(amount: Int) = _state.update {
        if (it.isDead) it
        else it.copy(current = (it.current - amount).coerceAtLeast(0))
    }

    fun heal(amount: Int) = _state.update {
        if (it.isDead) it
        else it.copy(current = (it.current + amount).coerceAtMost(it.max))
    }
}
```

Why no `scope.launch` around `_state.update`: nothing inside is suspending,
and `MutableStateFlow.update { }` is synchronous and atomic. Wrapping in
`launch` would defer the update to a later tick and make two damage calls
in the same frame race against each other.

Consumers derive what they need from the one Flow:

```kotlin
health.state.map { it.fraction }                               // for the HUD
health.state.map { it.isDead }.distinctUntilChanged()          // for death
```

### When to switch to sealed actions

For a 1-2 mutator component, `health.damage(10)` says the same thing as
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

class HealthComponent(...) {
    val state: StateFlow<HealthState> = ...

    fun onAction(action: HealthAction) = when (action) {
        is HealthAction.Damage -> handleDamage(action.amount)
        is HealthAction.Heal   -> handleHeal(action.amount)
        is HealthAction.SetMax -> handleSetMax(action.max)
        HealthAction.Revive    -> handleRevive()
    }

    private fun handleDamage(amount: Int) = _state.update {
        if (it.isDead) it else it.copy(current = (it.current - amount).coerceAtLeast(0))
    }

    private fun handleHeal(amount: Int) = _state.update { ... }
    private fun handleSetMax(max: Int) = _state.update { ... }
    private fun handleRevive() = _state.update { ... }
}
```

`onAction` is a single `when` that fans out directly into the concrete
handlers. No extra `reduce` indirection — the `when` *is* the dispatch.
Each handler stays small and individually readable, and you can call them
directly from inside the class (e.g. from a coroutine that already knows
which action to apply) without having to construct a `HealthAction` just
to route through `onAction`.

The migration from methods to actions doesn't change the consumer side
(state Flow stays identical), so it's safe to defer until the component
actually grows.

## MovementComponent (direction-driven for reusability)

Lives in `components/`. Takes a `Vector2` direction so an AI-controlled
enemy can reuse the same component by feeding in a computed direction
instead of player input. The Node owns the input source, the component
owns the physics push.

```kotlin
// components/MovementComponent.kt
class MovementComponent(
    private val body: CharacterBody2D,
    private val speed: Float = 220f,
) {
    private val _velocity = MutableStateFlow(Vector2.ZERO)
    val velocity: StateFlow<Vector2> = _velocity.asStateFlow()

    fun move(direction: Vector2) {
        val v = direction.normalized() * speed.toDouble()
        body.velocity = v
        body.moveAndSlide()
        _velocity.value = body.velocity
    }

    fun stop() {
        body.velocity = Vector2.ZERO
        _velocity.value = Vector2.ZERO
    }
}
```

## DamageComponent (transient events, no persistent state)

Lives in `components/`. A pure calculator that turns "raw incoming damage
+ context" into "actual damage to apply". No persistent state, so no
`StateFlow` — and crucially, damage is a transient event: the same value
landing twice in a row must produce two distinct outcomes, which state
diffing can't represent.

```kotlin
// components/DamageComponent.kt
data class DefenseStats(val armor: Int, val resistance: Float)

class DamageComponent {
    fun calc(rawDamage: Int, defense: DefenseStats): Int {
        val afterArmor = (rawDamage - defense.armor).coerceAtLeast(1)
        return (afterArmor * (1f - defense.resistance)).toInt().coerceAtLeast(1)
    }
}
```

If you later want to broadcast damage events (floating numbers, combat
log, screen shake), expose them through a `SharedFlow` on whatever
component owns the entity's combat state:

```kotlin
data class DamageEvent(val amount: Int)

class CombatComponent(
    private val damage: DamageComponent,
    private val health: HealthComponent,
) {
    private val _events = MutableSharedFlow<DamageEvent>(extraBufferCapacity = 16)
    val events: SharedFlow<DamageEvent> = _events.asSharedFlow()

    fun applyHit(rawDamage: Int, defense: DefenseStats) {
        val actual = damage.calc(rawDamage, defense)
        health.damage(actual)
        _events.tryEmit(DamageEvent(amount = actual))
    }
}
```

`SharedFlow` is the right primitive here precisely because two identical
`DamageEvent(amount = 10)` emissions stay distinct. A `StateFlow` would
collapse them via `distinctUntilChanged` semantics and the second damage
number would never show up.

## AnimationComponent (reactive, subscribes to other components' Flows)

Lives in `components/`. Subscribes once in `init`. Nothing per-frame; the
animation reacts to state changes published by the other components. A
private `SharedFlow` is used for transient triggers (hit flash) that need
to fire even when the same value repeats.

```kotlin
// components/AnimationComponent.kt
class AnimationComponent(
    private val sprite: AnimatedSprite2D,
    scope: CoroutineScope,
    movement: MovementComponent,
    health: HealthComponent,
) {
    private val _damageOverlay = MutableSharedFlow<Int>(extraBufferCapacity = 8)

    init {
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

        _damageOverlay
            .onEach { sprite.play("hurt") /* spawn damage number, etc. */ }
            .launchIn(scope)
    }

    fun flashDamage(amount: Int) {
        _damageOverlay.trySend(amount)
    }
}
```

`flashDamage` is a public method, not a public channel. The internal
`MutableSharedFlow` stays private, same encapsulation principle as
exposing `state` instead of `_state`. Callers say what they want done, not
which mechanism delivers it.

## Player (the Node that wires it together)

Lives in `entities/player/`. The Node owns its components (a mix of shared
and bespoke), reads its one source of input, and gates physics on
aliveness. Everything else is delegated.

```kotlin
// entities/player/Player.kt
@RegisterClass
class Player : CharacterBody2D() {

    private val nodeScope = NodeScope()

    private lateinit var health: HealthComponent
    private lateinit var movement: MovementComponent
    private lateinit var animation: AnimationComponent
    private lateinit var damage: DamageComponent

    @RegisterFunction
    override fun _ready() {
        val sprite = getNodeAs<AnimatedSprite2D>("AnimatedSprite2D")!!

        health = HealthComponent(initial = 100)
        movement = MovementComponent(body = this, speed = 220f)
        animation = AnimationComponent(sprite, nodeScope, movement, health)
        damage = DamageComponent()

        nodeScope.launch {
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
    override fun _exitTree() {
        nodeScope.cancel()
    }

    fun gotHit(rawDamage: Int, attackerDefenseBreak: Int = 0) {
        val defense = DefenseStats(armor = 5 - attackerDefenseBreak, resistance = 0.1f)
        val actual = damage.calc(rawDamage, defense)
        health.damage(actual)
        animation.flashDamage(actual)
    }
}
```

Pattern worth naming: in `gotHit`, damage is a transient event. State
diffing on `health.state` would miss the case where the player gets hit
for the same amount twice in a row (current goes 100 → 90 → 80, but "a hit
happened" needs to fire twice). That's why `animation.flashDamage(...)` is
an explicit call rather than something the animation component derives by
watching health. When the fan-out from `gotHit` grows to three or four
calls, consider a `PlayerEvents` `SharedFlow` that interested components
subscribe to themselves, rather than the Player explicitly notifying each
one.

## Reusing the same components on an enemy

Because none of `HealthComponent`, `MovementComponent`, `AnimationComponent`,
or `DamageComponent` know anything about the Player, an enemy node composes
the exact same set and supplies its own input source (an AI brain instead
of `Input.getVector`):

```kotlin
// entities/enemies/Slime.kt
@RegisterClass
class Slime : CharacterBody2D() {

    private val nodeScope = NodeScope()

    private lateinit var health: HealthComponent
    private lateinit var movement: MovementComponent
    private lateinit var animation: AnimationComponent
    private lateinit var ai: SlimeAi               // bespoke, lives in entities/enemies/

    @RegisterFunction
    override fun _ready() {
        val sprite = getNodeAs<AnimatedSprite2D>("AnimatedSprite2D")!!
        health = HealthComponent(initial = 30)
        movement = MovementComponent(body = this, speed = 60f)
        animation = AnimationComponent(sprite, nodeScope, movement, health)
        ai = SlimeAi(scope = nodeScope, perception = /* ... */)
    }

    @RegisterFunction
    override fun _physicsProcess(delta: Double) {
        if (!health.state.value.isDead) {
            movement.move(ai.desiredDirection())
        }
    }

    @RegisterFunction
    override fun _exitTree() {
        nodeScope.cancel()
    }
}
```

`SlimeAi` lives in `entities/enemies/` because it's specific to this
enemy. If a second enemy ends up wanting the same brain, hoist it into
`components/` (or a sibling `ai/` package) at that point.

## Signals to Flows: full pattern

Built-in Godot signals on nodes are exposed as signal properties in the
Kotlin binding. Wrapping them with `callbackFlow` gives a Flow whose
collection lifecycle drives the connect/disconnect, so you never end up
double-subscribed or leaking after the collector cancels.

```kotlin
@RegisterClass
class TriggerZone : Area2D() {

    private val nodeScope = NodeScope()

    val playerEntered: Flow<Player> = callbackFlow {
        val callable = Callable { body: Node2D -> trySend(body) }
        bodyEntered.connect(callable)
        awaitClose { bodyEntered.disconnect(callable) }
    }
        .filterIsInstance<Player>()
        .shareIn(nodeScope, SharingStarted.WhileSubscribed())

    @RegisterFunction
    override fun _ready() {
        playerEntered
            .onEach { onPlayerEnter(it) }
            .launchIn(nodeScope)
    }

    @RegisterFunction
    override fun _exitTree() {
        nodeScope.cancel()
    }

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

## Code wiring vs editor wiring: rule of thumb

Wire in code when the connection is part of how your system behaves; wire
in the editor when the connection is part of how this particular scene is
arranged. Most gameplay code falls into the first bucket, which is why
"prefer code wiring in `_ready`" holds up in practice.

Code wiring wins for refactor safety (the IDE follows a rename),
greppability (the connection is text in a `.kt` file), and clean git diffs
(`.tscn` connection blocks are noisy and easy to merge wrong). Editor
wiring wins when a designer needs to rearrange wiring without touching
code, or when the connection is genuinely scene-local content rather than
system logic.
