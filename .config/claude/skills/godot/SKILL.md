---
name: godot
description: Godot Engine general knowledge — scene-tree composition, signals, common pitfalls (Sprite2D offset vs position, negative-scale physics trap, preload memory chains), VisibleOnScreen culling, pixel-art resolution setup, editor tips. Apply whenever the user mentions Godot, .tscn/.gd/project.godot files, Godot node types (Sprite2D, Area2D, CharacterBody2D, Node2D, etc.), GDScript, scenes, signals in a game-engine context, or game architecture in Godot. Engine-level — language-agnostic. For language-binding specifics, also load the relevant binding skill.
---

# Godot Engine

This skill captures engine-level Godot knowledge that applies regardless of
which scripting language is in use. The aim is to short-circuit the
well-known pitfalls — several of them have killed projects late enough
that recovery meant a rewrite — and to encode the composition patterns
the engine quietly pushes you toward. Examples use GDScript as the
engine's native language.

For language-binding specifics, load the relevant binding skill alongside
this one.

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

## Composition

Godot is composition-over-inheritance. There's no single "correct" shape
for a component — pick the extraction level that matches your project:

- **Plain class / `RefCounted` script** — `class_name` script with
  no scene presence; instantiated in the entity's `_ready()`. No scene
  tree presence, no Inspector. Default for code-first solo projects.
- **Script on child Node** — per-behaviour script (`class_name
  HealthComponent extends Node`) attached to a child Node within the
  entity scene. Reuse at the script level.
- **Component scene** — each behaviour is `health_component.tscn` you
  instance into multiple entity scenes. Maximum reuse and designer
  ergonomics, maximum editor ceremony.

The official Godot docs lean conservative (self-contained scenes + DI);
popular community tutorials use the middle level; full "components as
scenes" is real but opinionated. There is no universal best practice —
match the level to the team and the workflow.

The rules that apply at every level:

- **Components are passive.** No `_process` / `_physicsProcess` on a
  gameplay component — the controller (Player, GoblinAI) ticks and
  calls `movement.move(body, dir, speed)`, `health.damage(n)`,
  `animation.applyPose(...)` synchronously. Components expose methods
  and state; they don't drive frames. Exception: engine-event
  components like an `Area2D`-rooted `HurtboxComponent` reacting to
  `body_entered`.
- **Components are context-agnostic.** Rock test: if you attached this
  to a literal rock, would it still function? `move(body, dir, speed)`
  — yes; `move()` reading a hardcoded player input — no.
- **Intent passed as method argument, never as a caller-written
  field.** `movement.move(body, dir, speed)` — not `movement.direction =
  dir; movement.move()`.
- **"Call Down, Signal Up."** Controllers call children's methods
  downward; children emit signals upward. Children don't reach for
  their parent.
- **Mechanism vs content.** A reusable component drives a mechanism
  (the `AnimationTree` API, velocity application). The entity's scene
  resource carries the content (sprites, animation clips, stat
  values). Two entities can share `HumanoidToolAnimation` because their
  AnimationTree resources share the *shape* even with different bound
  clips.
- **Rule of three for extraction.** Inline on the first entity. Extract
  on the second concrete one. Don't extract on speculation; the
  abstraction shapes around the only existing case and fights the next.
- **Default to code wiring, not editor wiring.** Reach child nodes via
  `@onready var x: T = $Child` (or `get_node("Child")` in `_ready()`)
  rather than `@export` slots dragged in the Inspector. Code refs are
  tracked by your IDE / `grep` through file renames, class refactors,
  and *Find Usages*; editor refs are opaque blobs serialised into
  `.tscn` files that break silently when you move scripts, rename
  classes, or reorganise the source tree. The trade-off is real: code
  refs break on **node** renames (loud runtime nil-deref, easy to spot
  and fix); editor refs break on **file/class** refactors (often
  silent, harder to find). Pick the failure mode you can debug. For
  solo, code-first work, code wiring wins.
- **Don't fear node count** (if you do reach scene-component level).
  Nodes in Godot 4 are cheap.

If you go to scene-component level: **avoid `@export` names that shadow
`Node` methods** — `tree`, `name`, `position`, `path`, `parent`,
`owner`. `@export var tree: AnimationTree` clashes with
`Node.get_tree()`. Use `animation_tree`, `display_name`,
`target_position`. **Don't double-wire:** if a component is a child at
a known name, reach it with `@onready var x = $Child` — don't *also*
`@export` it on the parent.

Full details — the four-level spectrum with trade-offs, a worked
example from a real project, dependency injection styles, when to
escalate from class to scene-component, mechanism/content example, and
pitfalls — in `references/composition.md`.

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
in the editor's **Output** panel. If you're using a non-GDScript
binding, prefer the binding's wrapper around the engine functions over
its host-runtime print — the latter writes to host stdout, only visible
in the terminal that launched the editor.

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

## References

- `references/composition.md` — full composition pattern: rules,
  passive components, dependency styles (`@export` vs method arg),
  three reach mechanisms, composition-by-mixing across entity types,
  when to extract (rule of three), mechanism vs content, name
  collisions, pitfalls. Load when actually designing components, not
  for the one-line "what's a component."

## What this skill deliberately does not cover

- Language-specific scripting details — those live in language-binding
  skills.
- Shader programming, rendering pipeline internals.
- 3D-specific concerns (this skill leans 2D — the principles transfer
  but the node names differ: `Spatial`/`Node3D`, `Area3D`, etc.).
- Networking and multiplayer.

If a topic is missing and you need it, ask — it can be added or split
into a `references/` file later.
