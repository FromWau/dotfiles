# Coroutines

Kotlin-only, and off by default. Turn them on once:

```kotlin
godot {
    isGodotCoroutinesEnabled.set(true)
}
```

## What they are for

Coroutines fit gameplay that is **a sequence of dependent waits**: wait for the
player to enter, stop the music, spawn a wave, wait until every enemy is dead,
pay out a reward, restore the music, remove yourself. Written with signals and
flags that becomes a hand-rolled state machine spread over several methods.
Written as a coroutine it stays one readable function that keeps its local
values across the waits and never blocks the main thread.

They are not a replacement for `_process` and `_physicsProcess`. Per-frame
gameplay is synchronous by nature, and a direct call in `_physicsProcess` says
what it does with less machinery. Reach for a coroutine when the shape of the
logic is genuinely "do this, wait, then do that".

## Scopes and lifetime

`Node.launch` starts a coroutine **owned by that node**, valid once the node
is in the tree. The binding cancels the node's `NodeScope` when the node
leaves the tree, and that cancels its children and pending waits with it. This
is what makes coroutines safe here: the lifetime is the node's lifetime, so
nothing survives to touch a freed engine object.

```kotlin
override fun _ready() {
    launch { runEncounter() }              // NodeScope receiver
}

private suspend fun NodeScope.runEncounter() { ... }
```

`Node.async` is the same with a `Deferred<T>` result. Inside either block the
ordinary builders (`launch`, `async`, `coroutineScope`, `supervisorScope`)
work and inherit the node's lifetime unless you deliberately hand them another
scope.

For work that belongs to no node, `godotCoroutine()` returns a plain
`CoroutineScope` dispatching on Godot's main thread. It is yours to keep and
to cancel; nothing cancels it for you.

## Waiting for frames

```kotlin
awaitNextFrame()            // SceneTree-wide: any coroutine, while a SceneTree exists
awaitNextPhysicsFrame()

awaitNextProcess()          // node-owned: only inside Node.launch / Node.async
awaitNextPhysicsProcess()
```

The node-owned waits resume on a frame where **that node can process**, so a
paused, disabled or detached node does not continue as though it were still
running. Use those for gameplay and the SceneTree-wide ones for global
systems.

## Signals

```kotlin
victoryJingle.finished.await()                      // exactly one emission

launch {
    healthChanged.asFlow<Int>().collect { hp ->     // a stream
        healthBar.value = hp
    }
}

val player = bodyEntered.asFlow<Node3D>().first { it is Player }
```

`asFlow()` is cold: nothing is connected until collection starts, the
collection owns the connection, and cancelling it disconnects. That is what
makes flows safe here, and it is why the collection must live inside a
node-owned scope rather than a scope you share by hand. For a single event
`await()` is clearer than a flow with `first`.

## Threads

`Node.launch` and `godotCoroutine()` start on Godot's main thread, and signal
and frame waits resume there, so ordinary scene-tree work stays direct.

```kotlin
val route = offload { calculateRoute(grid, start, goal) }   // pure CPU only

threadSafe {
    navigationAgent.targetPosition = route.last()           // back on the main thread
}
```

Never touch nodes, resources or the scene tree inside `offload`. Wrap the part
that does in `threadSafe`.

## Worked shape

```kotlin
@Script
class Encounter : Area3D() {

    @Export var enemyScenes: VariantArray<PackedScene> = VariantArray()
    @Export lateinit var battleMusic: AudioStreamPlayer

    override fun _ready() {
        launch { battleMusic.finished.asFlow().collect { battleMusic.play() } }
        launch { runEncounter() }
    }

    private suspend fun NodeScope.runEncounter() {
        bodyEntered.asFlow<Node3D>().first { it is Player }
        awaitNextProcess()

        val level = checkNotNull(getParent())
        battleMusic.play()

        val defeated = spawnEnemies(level).map { enemy ->
            async { enemy.treeExiting.await() }
        }
        defeated.awaitAll()

        battleMusic.stop()
        queueFree()
    }
}
```

Both coroutines belong to the `Encounter` node. If it leaves the tree
mid-fight, the flow collection, the frame wait and every `treeExiting` wait
are cancelled together, with no `_exitTree` bookkeeping to write.

## Imports

They live under `godot.coroutines`:

```kotlin
import godot.coroutines.NodeScope
import godot.coroutines.asFlow
import godot.coroutines.await
import godot.coroutines.awaitNextProcess
import godot.coroutines.launch
import godot.coroutines.offload
```

Standard `kotlinx.coroutines` and `kotlinx.coroutines.flow` imports work
alongside them as usual.
