---
name: godot
description: Godot Engine general knowledge — scene-tree composition, signals, common pitfalls (Sprite2D offset vs position, negative-scale physics trap, preload memory chains), VisibleOnScreen culling, pixel-art resolution setup, editor tips. Apply whenever the user mentions Godot, .tscn/.gd/project.godot files, Godot node types (Sprite2D, Area2D, CharacterBody2D, Node2D, etc.), GDScript, scenes, signals in a game-engine context, or game architecture in Godot. Engine-level — language-agnostic. For Kotlin/JVM scripting specifically, also load `godot-kotlin-jvm`.
---

# Godot Engine

This skill captures engine-level Godot knowledge that applies regardless of
which scripting language (GDScript, C#, Kotlin/JVM, …) is in use. The aim
is to short-circuit the well-known pitfalls — several of them have killed
projects late enough that recovery meant a rewrite — and to encode the
composition patterns the engine quietly pushes you toward.

If the user is using Godot Kotlin/JVM (custom fork, `.gdj` files,
`com.utopia-rise.godot-kotlin-jvm` plugin), also load the
**godot-kotlin-jvm** skill for the JVM-specific layer.

## Mental model

- Godot is **scene-based**. A scene is a tree of Nodes saved as `.tscn`.
  Scenes can be instanced as children of other scenes; the engine flattens
  the result at runtime.
- Nodes have a **lifecycle**: `_ready` (once, after being added to the
  tree), `_process(delta)` (every frame), `_physics_process(delta)` (fixed
  timestep). Override only what you need.
- Nodes communicate via **signals** — a typed pub/sub mechanism baked into
  every Node. Signals decouple producer and consumer; the producer doesn't
  know who's listening.
- The Godot **editor** is a runtime: hitting F5 launches the project,
  which loads `project.godot`, instantiates the main scene, and starts the
  loop. Editor crashes ≠ game crashes — but editor tools and game code
  share the same runtime, so a bad `@tool` script *can* take the editor
  down.

## Composition: components are scenes

Godot is already a composition-over-inheritance engine. The temptation —
especially coming from OO backgrounds — is to build deep class hierarchies
(`Enemy → FlyingEnemy → HomingFlyingEnemy`). Resist this. **Build each
behaviour as its own scene-with-script and drop it as a child Node into
every entity that needs it.**

This is the central pattern. A `HealthComponent` isn't a plain script
hung off a generic `Node` inside `Player.tscn`. It's:

1. A Node subclass with its own script (`HealthComponent.gd` /
   `HealthComponent.gdj` / `HealthComponent.cs`).
2. Saved as its own scene: `health_component.tscn`.
3. Instanced as a child of `Player.tscn`, `Enemy.tscn`, `NPC.tscn`, and
   anything else that needs hit points.
4. Configured per-instance via `@export` properties (max HP differs
   between player and goblin; the script is identical).

```
res://components/
├── health_component.tscn      (script: HealthComponent)
├── movement_component.tscn    (script: MovementComponent)
├── hurtbox_component.tscn     (script: HurtboxComponent, root: Area2D)
└── animation_component.tscn   (script: AnimationComponent)

res://entities/
├── player.tscn      (CharacterBody2D + the four components as children)
├── enemy_goblin.tscn (CharacterBody2D + the same four components)
└── npc_villager.tscn (CharacterBody2D + Health + Animation, no Movement)
```

The component is reusable not because of clever inheritance but because
it's a *scene-shaped artifact* the editor can drag into anything. Designers
can build new enemies without writing code: instance the base scene, drop
the components they want, tune the `@export` values.

**Rules that make this work:**

- **Components don't know about each other directly.** They communicate
  via signals (or your language's reactive primitive — Flows in Kotlin,
  events in C#). `HealthComponent` emits `died`; `AnimationComponent`
  listens. Neither holds a reference to the other. This is what lets the
  same component scene drop into different parents without coupling.
- **Components are context-agnostic.** The rock test: *if you attached
  this script to a literal rock, would it still function?* If yes, it's
  reusable. A `MovementComponent` that hardcodes "the player's input" has
  failed the test; one that takes a `Vector2` direction has passed.
  Components own their data; they don't know what's driving them.
- **The parent Node is the coordinator** when one is needed (e.g. reading
  input, gating physics on aliveness). Don't make the parent fat — push
  logic down into the components. The parent's job is to wire signals
  between siblings and own whatever is genuinely unique to it (input
  handling for Player, AI ticks for Enemy).
- **`@export` is your DI container.** Drag references between sibling
  components in the inspector (`@export var health: HealthComponent`);
  don't hardcode `get_node("../HealthComponent")`. Exported references
  refactor cleanly; string paths break silently when nodes move. The
  typed export also blocks the inspector from accepting the wrong node
  type, which catches misconfigurations at edit time instead of runtime.
- **Per-entity overrides via the inspector.** A component scene defines
  defaults; each entity overrides what it needs (`max_hp = 100` for
  player, `max_hp = 20` for goblin) without touching the script.
- **Don't fear node count.** Nodes in Godot 4 are cheap. 100 enemies
  with 10 components each is 1000 extra nodes — the engine handles this
  without breaking a sweat. The cost of a fat 5000-line `player.gd` you
  can't safely refactor dwarfs any per-node overhead. Decompose freely.

### Component scene template

The minimum component scene is *one Node, with a script attached*. The
root Node type matters — pick what the component genuinely needs:

- Pure logic / state (`HealthComponent`, `StateMachineComponent`) →
  root `Node`.
- Physics interaction (`HurtboxComponent`, `HitboxComponent`) → root
  `Area2D` / `Area3D`.
- Per-frame work (`MovementComponent` driving physics) → root `Node`
  (the *parent* `CharacterBody2D` does the actual `move_and_slide`).

Save the scene to `res://components/` so they're easy to find and so the
editor's "instance child scene" picker surfaces them naturally.

### Reaching components: typed `@export` refs vs unique names

There are two refactor-safe ways for a script to grab a reference to
another node in the same scene. Pick by where the script lives:

- **Typed `@export` reference** (`@export var health: HealthComponent`)
  — the default. Best when the consumer is a sibling or parent and you
  can drag the reference in the inspector. The type acts as a slot:
  Godot will only let you drop nodes whose script matches the declared
  type, so misconfiguration shows up at edit time instead of at runtime.
- **Scene unique name** (`%HealthComponent` / `get_node("%HealthComponent")`)
  — best when the consumer is far away in the scene tree and dragging
  isn't practical (a HUD node deep inside `UI/CanvasLayer/...` reaching
  for a component buried under `Player/Body/Equipment/...`). Right-click
  the target node in the editor → *Access as Unique Name*. A `%` badge
  appears, and any script in the same scene can now find it by name,
  regardless of where either node moves.

Both refactor cleanly: typed exports survive renames and follow the IDE
through *Find Usages*; unique names survive scene-tree restructuring.
What you avoid in both cases is brittle relative paths
(`get_node("../../UI/HealthBar")`) — those break silently the first time
a node moves.

### When to use a child Node vs a plain script

- **Child Node** — when the thing has lifecycle (needs `_ready`,
  `_process`, signals, or a `_physics_process` tick) or needs to appear
  in the scene tree for the editor to wire it up.
- **Plain class / resource script** — for pure data and pure
  computation: damage formulas, item definitions, save-state serialisers.
  These don't need to be Nodes.
- **`Resource` subclass** — for data that's shared between scenes and you
  want the editor to edit (item stats, dialogue tables, level configs).
  Resources are serialisable and the editor knows how to inspect them.
- **Autoload (singleton)** — for genuinely game-wide state: pause
  manager, save system, audio mixer, input remapper. Use sparingly;
  autoloads are global mutable state and they encourage the "everything
  reaches into everything" anti-pattern. If two scenes need to talk and
  one isn't a parent of the other, prefer a signal bus autoload over
  shared mutable state.

### Signals: wire in code, not in the editor

Godot's editor lets you right-click a signal in the Node panel and pick a
target method. **Avoid this for anything beyond designer-facing scene
content** (a level designer hooking a trigger zone to a door). Connections
made this way are serialised into the `.tscn` file, which means:

- Renaming the target method silently breaks the connection until you
  reopen the scene.
- You can't grep for the wiring.
- `.tscn` diffs become noisy in code review.

Wire in `_ready()` instead. It lives next to the logic it relates to and
is refactor-safe:

```gdscript
func _ready() -> void:
    health_component.died.connect(_on_died)
    hurtbox.body_entered.connect(_on_body_entered)
```

## Engine pitfalls (project-killing or close to it)

### Never flip facing direction by negative scaling

The intuitive way to "face left" is `scale.x = -1` on the entity's root.
**Do not.** Negative scale propagates to every child node, including
`Area2D`, `CollisionShape2D`, `RayCast2D`, and offsets. Visible collision
shapes still *render* correctly but physics interactions happen elsewhere
entirely. The symptoms — hits that miss, raycasts that lie, collision
normals that flip — are nearly impossible to reason about and tend to
surface late, after the bug has been baked into months of content.

**Use instead, in order of preference:**

1. `Sprite2D.flip_h` (or `flip_v`) for the visual flip.
2. Explicitly reposition child physics nodes by mirroring their
   `position.x`.
3. Store two local transforms (left/right) up front and swap between them.

**Rule of thumb:** never let visual convenience dictate physics truth.

### Preload / long-lived references keep entire scene chains alive

`preload()` and `load()` return reference-counted resources. As long as
*anything* still holds a reference, the resource — and everything it
transitively references — stays in memory, even after the node that used
it has left the tree.

The trap: a long-lived "main game" autoload preloads the main menu, which
preloads the opening cutscene, which preloads level 1. Because the
autoload never leaves the tree, the entire chain is pinned permanently,
even after the player is deep into level 5.

**Rules:**

- Load scenes as close to where they're used as possible.
- Prefer per-owner ownership: a `Player` node loading its own
  `Projectile.tscn` is fine — the reference dies with the player.
- For large scenes (whole levels, big cutscenes), `load()` at use time
  and let the reference drop when the consumer is freed. Don't pre-cache
  "for performance" without measuring.
- The question is never "is the scene still in the tree?" — it's "does
  anything still reference the resource?"

### Sprite2D: `position` vs `offset`

Both move a `Sprite2D`, and the inspector groups them visually so they
look interchangeable. They are not.

- **`position`** is inherited by the node's **children** (markers,
  collision shapes, projectile spawn points, hitboxes).
- **`offset`** affects only the **sprite's texture** — children stay put.

**Framing:** *position is game truth; offset is animation fiction.* If the
entity is actually moving in the world, change `position`. If you're
nudging the texture to line up with art for a frame of animation, change
`offset` so the projectile spawn and hurtbox don't drift along with it.

### Off-screen processing: VisibleOnScreenNotifier2D / Enabler2D

Enemies placed directly in a level run their physics, AI, and animations
every frame from the moment the level loads — even three screens away. A
tracking enemy might have wandered far from its placed position by the
time the player arrives.

- **`VisibleOnScreenNotifier2D`** emits `screen_entered` /
  `screen_exited` signals. Connect them to your spawn / pause logic.
- **`VisibleOnScreenEnabler2D`** attaches as a child and automatically
  disables `_process` / `_physics_process` on its parent when off-screen.
  Zero code.

For most "enemy only acts when on-screen" cases,
`VisibleOnScreenEnabler2D` is enough. For complex spawn policy (respawn
on re-entry, random intervals, kill-once-then-stop), build a custom
spawner on top of the notifier.

> In Godot 4.5+, the notifier rectangle has a "Show Rect" toggle so you
> can hide it visually in the editor without disabling its logic.

### Pixel-art base resolution and scaling: decide before content

Fixing scaling later means reworking art alignment everywhere.

**Recommended starting point for modern pixel-art games:**

- Base resolution: **640×360** or **320×180** (in `project.godot`,
  `display/window/size/viewport_width` and `viewport_height`). These
  scale by clean integers to 720p (×2), 1080p (×3), 1440p (×4), 4K (×6).
- Default window size: 1920×1080 (so it launches at a comfortable size —
  set via the override fields under "Advanced Settings").
- Stretch mode: `canvas_items` or `viewport`.
- Stretch aspect: `keep` (preserves art ratio on resize).
- Integer scaling: **on** for crisp pixels at any window size. Fractional
  scaling allows in-between window sizes but introduces shimmer.

Any code that does its own viewport / camera / HUD math implicitly
assumes the base resolution. Changing it later silently breaks hardcoded
coordinates.

## Debug god mode

Give the player a debug-only state with: faster movement, no gravity,
disabled hurt box. Costs ~20 minutes to add, saves hours over the life of
the project (no more "die at the boss, replay 30 seconds to retry").

Gate it on a debug flag so it doesn't ship:

```gdscript
@onready var debug_mode := OS.is_debug_build()

func _physics_process(_delta: float) -> void:
    if debug_mode and Input.is_action_just_pressed("debug_god"):
        god_mode = not god_mode
```

Side benefit: a "double speed" debug toggle has a history of accidentally
discovering real gameplay mechanics. Worth playing with the values.

## Output and logging

Use the engine's logging functions (`print`, `printerr`, `push_warning`,
`push_error`) so output goes through Godot's logging system and shows up
in the editor's **Output** panel. Language-native print (e.g. Kotlin
`println`, C# `Console.WriteLine`) writes to JVM/CLR stdout — only
visible in the terminal that launched the editor, not in the Output panel.

## Quick tips

- **`Engine.time_scale`** — globally slow down or speed up the game.
  Useful for debugging frame-by-frame and for hit-stop effects.
- **Cursor visibility** — `Input.mouse_mode = Input.MOUSE_MODE_HIDDEN`
  (or `CAPTURED`, `CONFINED`).
- **Alt + right-click** in the editor picks which overlapping node you
  meant to select. Only works in select mode.
- **3D character facing the wrong way?** Blender exports with -Z as
  forward, so models imported from Blender face *backwards* relative to
  Godot's +Z convention. When using a movement direction to drive a 3D
  character's facing, negate the relevant component
  (`look_direction.x = -input_direction.x`, etc.) or rotate the model
  child 180° on Y. Don't fix it by negating the body's `scale.z` — same
  physics trap as the 2D negative-scale pitfall above.
- **Blurry fonts** — enable MSDF (multi-channel signed distance field)
  under *Project Settings → GUI → Theme → Font*, or per-font resource.
  A single font then renders crisply at any scale.
- **Right-click → Favorite** in the FileSystem panel for frequently-used
  scenes. You can also color-tag folders.
- **Cap FPS** before shipping — uncapped debug builds can spin the GPU
  fan loudly. `Engine.max_fps = 144`, or set `application/run/max_fps`
  in `project.godot`.
- **Editor layout is persistable** — drag panels however you like, then
  *Editor → Editor Layout → Save Layout*.

## Don't blindly trust tutorials

The Godot tutorial ecosystem is vast and uneven. A lot of patterns work
fine for a 10-minute demo and quietly break under the weight of a real
project (the negative-scale flip above is the canonical example — it's
*recommended* by many beginner tutorials). Treat tutorials as learning
material; understand *why* something works before adopting it as a
pattern.

## What this skill deliberately does not cover

- Language-specific scripting details (GDScript syntax, C# bindings,
  Kotlin/JVM plugin) — those live in language-specific skills.
- Shader programming, rendering pipeline internals.
- 3D-specific concerns (this skill leans 2D — the principles transfer
  but the node names differ: `Spatial`/`Node3D`, `Area3D`, etc.).
- Networking and multiplayer.

If a topic is missing and you need it, ask — it can be added or split
into a `references/` file later.
