# Composition

The deep dive on composing behaviour in Godot. The SKILL.md summary covers the
rules; this file is what you load when actually designing or refactoring a
system. Engine-level only — language-binding specifics live in their own
skills. Examples are in GDScript.

## Composition isn't one pattern, it's a spectrum

The community calls all of these "composition." They're different shapes with different costs:

| Level | What | Reuse seam |
|---|---|---|
| **0 — Monolithic script** | One big `Player.gd` | None |
| **1 — Plain class / `RefCounted` script** | `class_name Movement extends RefCounted` instantiated as a field of the entity | Script |
| **2 — Script on child Node** | `class_name HealthComponent extends Node` attached to a child Node within `player.tscn` | Script |
| **3 — Component scene** | `health_component.tscn` you instance into `player.tscn` / `goblin.tscn` | Scene |

**Official Godot docs lean toward level 0/1** (self-contained scenes with no dependencies, signals for cross-scene calls). **Popular community tutorials (Heart Gamedev etc.) sit at level 2.** The full **"components-as-scenes" pattern is level 3** — most reuse, most editor ceremony, advocated in forums and some tutorials but not universal.

**Pick by what the reuse mechanism is and who's wiring it.** A solo developer doing code-first setup doesn't benefit from levels 2/3; a team with a level designer who composes new mobs from a component palette needs level 3. There is no single "correct" level.

## Worked example — code-first, level 1

A `Player` scene with two extracted behaviours: movement (generic) and animation (humanoid + tool, shared with future Zombie).

```
res://
├── data.gd                       # autoload or const-only — Tool enum, MoveState enum
├── entities/
│   ├── player.tscn               # CharacterBody2D + Sprite2D + AnimationTree + ...
│   ├── player.gd
│   └── (later) zombie.tscn       # same shape, different sprites
└── components/
    ├── movement.gd               # class_name Movement extends RefCounted
    └── humanoid_tool_animation.gd # class_name HumanoidToolAnimation extends RefCounted
```

`components/movement.gd` — stateless, body and speed both method args:

```gdscript
class_name Movement extends RefCounted

func move(body: CharacterBody2D, direction: Vector2, speed: int) -> void:
    body.velocity = direction * speed
    body.move_and_slide()
```

`components/humanoid_tool_animation.gd` — stateful in its *own* data
(playback handles), takes the tree at init:

```gdscript
class_name HumanoidToolAnimation extends RefCounted

var _tree: AnimationTree
var _move_sm: AnimationNodeStateMachinePlayback
var _tool_sm: AnimationNodeStateMachinePlayback

func _init(tree: AnimationTree) -> void:
    _tree = tree
    _move_sm = tree.get("parameters/MoveStateMachine/playback")
    _tool_sm = tree.get("parameters/ToolStateMachine/playback")

func apply_pose(tool: Data.Tool, facing: Vector2, is_moving: bool) -> void:
    _tool_sm.travel(Data.tool_state_name(tool))
    _move_sm.travel("Walk" if is_moving else "Idle")
    for state in ["Idle", "Walk"]:
        _tree.set("parameters/MoveStateMachine/%s/blend_position" % state, facing)
    for t in Data.Tool.values():
        _tree.set("parameters/ToolStateMachine/%s/blend_position" % Data.tool_state_name(t), facing)

func fire_tool_one_shot() -> void:
    _tree.set("parameters/ToolOneShot/request", AnimationNodeOneShot.ONE_SHOT_REQUEST_FIRE)
```

`entities/player.gd` — the controller. Owns `_physics_process`, instantiates components in `_ready`:

```gdscript
extends CharacterBody2D

@onready var _animation_tree: AnimationTree = $Animation/AnimationTree
var _movement: Movement
var _animation: HumanoidToolAnimation

# entity state — speed is per-entity, varies at runtime (sprint, debuff, etc.)
var _current_tool: Data.Tool = Data.Tool.HOE
var _facing: Vector2 = Vector2.DOWN
var _speed: int = 150

func _ready() -> void:
    _movement = Movement.new()
    _animation = HumanoidToolAnimation.new(_animation_tree)

func _physics_process(_delta: float) -> void:
    var dir := Input.get_vector("left", "right", "up", "down")
    var is_moving := dir != Vector2.ZERO
    if Input.is_action_just_pressed("action"): _animation.fire_tool_one_shot()
    if is_moving: _facing = dir.round()
    _movement.move(self, dir, _speed)
    _animation.apply_pose(_current_tool, _facing, is_moving)
```

When `Zombie` arrives, it reuses the **same component classes**, instantiated
in *its* `_ready` with its own values:

```gdscript
extends CharacterBody2D

@onready var _animation_tree: AnimationTree = $Animation/AnimationTree
var _movement: Movement
var _animation: HumanoidToolAnimation
var _speed: int = 80                  # different from Player; same field shape

func _ready() -> void:
    _movement = Movement.new()
    _animation = HumanoidToolAnimation.new(_animation_tree)

func _physics_process(_delta: float) -> void:
    var dir := _pick_ai_direction()  # AI, not input
    _movement.move(self, dir, _speed)
    _animation.apply_pose(_current_tool, _facing, dir != Vector2.ZERO)
```

Reuse at the **script-class** level. No scene-tree wiring. No `@export` to drag in the editor. No `.tscn` per component.

## The passive shape (applies at every level)

Whether the component is a plain class, a script-on-Node, or a scene, the call shape is the same:

- **No `_process` / `_physics_process` on components.** The controller ticks. The component exposes methods.
- **Intent is a method argument, never a field the caller writes.** `movement.move(body, dir, speed)` — not `movement.direction = dir; movement.move()`.
- **State the component owns is its own.** `HumanoidToolAnimation` caches two playback handles for its tree — that's its state. It doesn't cache "current facing" written by the controller.
- **"Call Down, Signal Up."** Parent calls methods on children downward (synchronous, ordered). Children emit signals upward when something noteworthy happens. Children never reach for their parent. ([Call Down, Signal Up — Go, Go, Godot!](https://www.gogogodot.io/patterns/call-down-signal-up/))

The rock test: if you attached this code to a literal rock, would it still function? `Movement.move(body, dir, speed)` — yes, it operates on whatever `body` you give it. `apply_pose(tool, facing, is_moving)` — yes, it drives whatever tree it was constructed with. Both pass.

## Mechanism vs content

A reusable component drives a **mechanism**; the per-entity scene resource carries the **content**.

In the example above, Player and Zombie both use `HumanoidToolAnimation`. Each has its own `AnimationTree` resource as a scene child. Both trees have the **same shape**: `MoveStateMachine + ToolStateMachine + ToolOneShot`, same state names. The trees bind those state names to different sprite animations. The class calls `tool_sm.travel("Hoe")` and the engine resolves which clip plays. **The class never knows or cares which sprite is on screen.**

When designing a candidate component, ask: what's mechanism (shared operations on a shared resource shape) vs content (per-entity values)? If the supposed "mechanism" turns out to be content (the method args only make sense for one entity), it's not reusable — it's that entity's glue mislabeled.

## When to escalate — the rule of three

Don't extract on speculation. Each level up the spectrum costs ceremony and bends the abstraction toward the only existing case.

| Situation | Action |
|---|---|
| Only Player needs this code | Inline in `player.gd`. No extraction. |
| Player and Zombie share the same shape | Extract to a **plain class** in `components/`. |
| Multiple entity scenes need per-instance config in editor | Promote to **scene component** (level 3). |
| "Someday I might want Zombie" | Inline. Extract when Zombie actually exists. |
| You have 5 concrete mobs and they all do X | Extract now — the abstraction sees all 5 shapes. |

The cost of premature extraction: a `Movement` shaped only around Player feels right until Goblin arrives and you have to rip out the input-coupled bits. The cost of deferred extraction: a 10-minute mechanical move when the second case arrives. **Defer when in doubt.**

## When a plain class earns vs scene component earns

Stay at level 1 (plain class) when:

- You initialize the component in code (`_ready` / `_init`), not the editor.
- Per-instance config is set in code (entity field, autoload constant), not the Inspector.
- The component has no lifecycle the engine needs to drive (no `_process`, `_physics_process`, signals to react to).
- You're the only person wiring entities (solo dev, no designer).
- You want the code testable without launching Godot.

Escalate to level 2/3 (Node + script, or scene component) when:

- A designer (not you) needs to compose new entities by dragging components in the editor.
- The component has per-instance config that should be editor-tunable (different `max_hp` per mob via Inspector).
- The component needs engine lifecycle (a `HurtboxComponent` reacting to `Area2D.body_entered`).
- The component needs to appear in the scene tree for the remote debugger.

For solo, code-first work, level 1 is the default and pays off most of the time.

## Wiring: prefer code over editor

When the parent reaches a child node, two refactor-relevant options:

- **Code wiring** — `@onready var x: T = $Child` (or `get_node("Child")` inside `_ready`).
- **Editor wiring** — `@export var x: T` and drag the child into the slot in the Inspector.

**Default to code wiring.** Code refs are tracked by your IDE / `grep` through file renames, class refactors, and *Find Usages*. Editor refs are opaque blobs serialised into `.tscn` files; they break silently when you move scripts, rename classes, or reorganise the source tree — and there's no IDE finder that will surface them.

The honest trade-off: code refs break on **node** renames (the script reads `$AnimationTree` but the node is now `$Anim` — runtime nil-deref, loud, easy to spot). Editor refs survive node renames (the reference follows). Pick the failure mode you can debug. For most projects, file/class refactors happen more often than scene-tree restructuring, so code wiring wins.

**Don't double-wire.** If a component is conventionally a direct child at a known name, pick the code wiring AND skip the `@export`. Adding both is two wiring steps for the same fact.

## Name collisions with `Node` methods

If you do reach level 2/3, watch out: `Node` exposes methods you don't think about — `get_tree()`, `get_name()`, `get_position()`, `get_parent()`, `get_owner()`, `get_path()`. Declaring `@export var tree: AnimationTree` collides with `Node.get_tree()` and creates subtle generated-accessor confusion across language bindings.

Rename to non-colliding names: `animation_tree`, `display_name`, `target_position`, `parent_entity`.

## Pitfalls

- **Generic `update(...)` method names.** Callers can't tell if the engine is calling it or the parent is. Verb-name what the component does: `move(body, dir, speed)`, `apply_pose(...)`, `damage(n)`, `heal(n)`. Reader knows immediately the parent is invoking an action.
- **Components holding "current intent" fields written by callers.** `movement.direction = dir; movement.move()` is the smell. Pass intent as a method arg.
- **Demoting a class because "it has no state."** A class with one method and no fields might just as well be a top-level function (or a `static` method on a util). `class Movement: func move(body, dir, speed)` is fine if you expect siblings (`jump`, `dash`); if it really is one operation forever, a top-level function is more honest.
- **Reaching for signals / async inside intra-frame gameplay.** Adds latency and frame-order ambiguity for what is logically a synchronous in-frame call. Use signals for cross-system observation (UI watches HP), not intra-frame mechanics. State machines and method calls are the right tool for `_physics_process`.
- **`Node2D` for non-positional components.** Adds a transform that does nothing but invites bugs ("why is the component at (50, 30)?"). Use `Node` — or no Node at all, if a plain class fits.
- **Adding a component as a scene child AND `@export`ing it on the parent.** Two wiring steps for the same fact. Pick `@onready var x = $Child` for known children; reserve `@export` for designer-tuneable or cross-scene refs.
- **Components doing init in field initializers when they depend on injected refs.** Field initializers run at construction, before `_ready`. If the dep is set via `@export` (scene file → injected after construction), reading it in a field initializer is a nil deref. Move the init to `_ready`.

## "Components are scenes" — when, and when not

Level 3 (each component is its own `.tscn`) earns its place when:

- Multiple entities reuse the component AND you want the wiring visible in the editor.
- A designer composes new entities by dragging component scenes onto a base.
- Per-instance config (Inspector-tuneable `@export`) genuinely varies per entity.

It does *not* earn its place when:

- You're the only one wiring entities and you prefer code-first setup.
- The "component" turns out to be one entity's glue.
- The component has no `@export` per-instance config worth tuning in the editor.

The code-first level-1 setup is the most common solo-dev shape. When the project's needs change (a second mob arrives, a designer joins, Inspector-tuning genuinely matters), the promotion path is mechanical — same method signatures, just promoted from `RefCounted` to `Node` and saved as a `.tscn`.

## Related reading

- [Scene organization — Godot official docs](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html) — the conservative position: self-contained scenes, DI when crossing boundaries.
- [Easy Composition in Godot 4 — Heart Gamedev](https://heartgamedev.substack.com/p/easy-composition-in-godot-4) — level 2 worked example.
- [Composition in Godot 4 — gotut.net](https://www.gotut.net/composition-in-godot-4/) — level 3 worked example.
- [Call Down, Signal Up — Go, Go, Godot!](https://www.gogogodot.io/patterns/call-down-signal-up/) — the communication pattern.
