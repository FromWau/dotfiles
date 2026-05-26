# Settings menu

A complete design for a AAA-style in-game settings menu in godot-kotlin-jvm.
Covers data model, service layer, persistence, engine apply, and the four
typical tabs (Graphics, Audio, Gameplay, Keybinds). Read this when starting
a settings system from scratch or when reviewing one — the decisions
captured here are non-obvious and have already been argued through.

## Scope

- Single JVM source set (no expect/actual). Godot's own APIs (`FileAccess`,
  `AudioServer`, `DisplayServer`, `InputMap`, `Environment`, `Viewport`,
  `TranslationServer`) already abstract the platform across all five
  godot-kotlin-jvm targets (Windows / Linux / macOS / Android / iOS).
- JSON persistence via `kotlinx.serialization`. No ktoml, no `ConfigFile`
  (Godot's INI thing) — we want round-trip of `@Serializable` data classes.
- Live-apply UX (no Apply/Cancel buttons). Every UI mutation flows through
  the service, applies to the engine immediately, and is persisted after a
  2-second debounce.
- Game state (saves, run state) lives in a *separate* file from settings.
  "Reset progress" only touches game state.

## Data model

The settings tree is a sealed hierarchy. Each tab is one variant of
`Settings`, and `SettingsConfig` is the bundle that goes to disk.

```kotlin
sealed interface Settings {
    @Serializable data class Audio(
        val master: Float = 1f,
        val music: Float = 0.8f,
        val sfx: Float = 1f,
        val voice: Float = 1f,
        val ambient: Float = 0.8f,
        val ui: Float = 1f,
        val outputDevice: String = "Default",
        val mono: Boolean = false,
    ) : Settings

    @Serializable data class Graphics(
        // Display
        val resolution: Resolution = Resolution(1920, 1080),
        val windowMode: WindowMode = WindowMode.WINDOWED,
        val monitor: Int = 0,
        val vsync: VSyncMode = VSyncMode.ENABLED,
        val hdr: Boolean = false,
        val brightness: Float = 1f,
        val uiScale: Float = 1f,
        // Quality
        val textureQuality: Quality = Quality.HIGH,
        val shadowQuality: Quality = Quality.HIGH,
        val shadowDistance: Float = 1f,
        val antiAliasing: AntiAliasing = AntiAliasing.MSAA_4X,
        val anisotropic: Int = 16,
        val ssao: Boolean = true,
        val ssr: Boolean = true,
        val bloom: Boolean = true,
        val volumetricFog: Boolean = false,
        val viewDistance: Float = 1f,
        // Performance
        val fpsCap: Int = 0,  // 0 = unlimited
        // Post-fx
        val motionBlur: Boolean = false,
        val depthOfField: Boolean = false,
        val chromaticAberration: Boolean = false,
        val filmGrain: Boolean = false,
    ) : Settings

    @Serializable data class Gameplay(
        val difficulty: Difficulty = Difficulty.NORMAL,
        val language: String = "en",
        val subtitles: Boolean = true,
        val fov: Float = 90f,
        val cameraShake: Float = 1f,
        val tutorialHints: Boolean = true,
        val autoSaveIntervalMinutes: Int = 5,
    ) : Settings

    @Serializable data class Keybinds(
        val actions: Map<String, ActionBindings> = emptyMap(),
    ) : Settings
}

@Serializable
data class SettingsConfig(
    val audio: Settings.Audio = Settings.Audio(),
    val graphics: Settings.Graphics = Settings.Graphics(),
    val gameplay: Settings.Gameplay = Settings.Gameplay(),
    val keybinds: Settings.Keybinds = Settings.Keybinds(),
) : Config {
    @Transient override val name: String = "settings"
}
```

**No metadata in the data layer.** UI labels, descriptions, and any
"warning: this changes the look of everything" copy live in the menu UI
(directly or via `tr()` i18n keys). The data model is just data — no
`SettingMeta`, no `@Setting` annotations, no `needs_restart` flag.

**Why no `needs_restart`?** Every Godot 4.x runtime API used here hot-applies
(`DisplayServer.windowSetSize`, `Viewport.msaa3d`, `Environment.*`,
`AudioServer.setBusVolumeDb`, `InputMap.actionAddEvent`,
`TranslationServer.setLocale`). The one Godot setting that *would* require
a restart is the rendering backend (Forward+ / Mobile / Compatibility),
which is a developer choice, not a user-facing toggle. If you ever expose
it, hardcode the restart prompt on that one row.

## Keybind shape

Layout-independent: bind on `physicalKeycode`, not `keycode`. The
physical-key W stays as W regardless of QWERTY/AZERTY/Dvorak.

```kotlin
@Serializable
sealed interface InputBinding {
    @Serializable @SerialName("key")
    data class Key(val physicalKeycode: Int, val mods: Int = 0) : InputBinding

    @Serializable @SerialName("mouse")
    data class Mouse(val button: Int) : InputBinding

    @Serializable @SerialName("joy_button")
    data class JoyButton(val button: Int) : InputBinding

    @Serializable @SerialName("joy_axis")
    data class JoyAxis(val axis: Int, val direction: Int) : InputBinding
}

@Serializable
data class ActionBindings(
    val primary: InputBinding? = null,
    val secondary: InputBinding? = null,
)
```

`KeybindsSettings.actions` is a `Map<actionName, ActionBindings>` —
`"jump" → ActionBindings(primary = Key(KEY_SPACE), secondary = JoyButton(0))`.

JSON output stays readable:
```json
{
  "keybinds": {
    "actions": {
      "jump": {
        "primary":   { "type": "key",        "physicalKeycode": 32, "mods": 0 },
        "secondary": { "type": "joy_button", "button": 0 }
      }
    }
  }
}
```

**Show on all platforms.** Even mobile-only games get hybrid users with
Bluetooth controllers and external keyboards; the tab being there beats
the tab being missing.

## Service

`SettingsService` owns the state and exposes a typed mutator. Sealed
hierarchy + `inline reified` gives variant-typed update calls without
reflection:

```kotlin
class SettingsService(
    private val configManager: ConfigManager,
    private val applier: SettingsApplier,
    scope: CoroutineScope,
) {
    companion object { private const val TAG = "SettingsService" }

    private val _state = MutableStateFlow(SettingsConfig())
    val state: StateFlow<SettingsConfig> = _state.asStateFlow()

    init {
        when (val r = configManager.load(SettingsConfig())) {
            is Result.Success -> _state.value = r.value
            is Result.Error   -> Log.tag(TAG).w { "Using defaults: ${r.error}" }
        }
        applier.apply(_state.value)

        // Debounced persistence — coalesces bursts of `update` calls into
        // a single disk write 2s after the last update.
        scope.launch {
            _state.drop(1)
                .debounce(2.seconds)
                .collect { snapshot ->
                    when (val r = configManager.save(snapshot)) {
                        is Result.Error -> Log.tag(TAG).e { "Save failed: ${r.error}" }
                        is Result.Success -> Log.tag(TAG).d { "Settings saved" }
                    }
                }
        }
    }

    inline fun <reified T : Settings> update(crossinline transform: (T) -> T) {
        _state.update { cfg ->
            @Suppress("UNCHECKED_CAST")
            when (T::class) {
                Settings.Audio::class    -> cfg.copy(audio    = transform(cfg.audio    as T) as Settings.Audio)
                Settings.Graphics::class -> cfg.copy(graphics = transform(cfg.graphics as T) as Settings.Graphics)
                Settings.Gameplay::class -> cfg.copy(gameplay = transform(cfg.gameplay as T) as Settings.Gameplay)
                Settings.Keybinds::class -> cfg.copy(keybinds = transform(cfg.keybinds as T) as Settings.Keybinds)
                else -> error("Unknown Settings variant: ${T::class}")
            }
        }
        applier.apply(_state.value)
    }
}
```

Call sites:
```kotlin
service.update<Settings.Gameplay> { it.copy(difficulty = Difficulty.HARD) }
service.update<Settings.Audio>    { it.copy(master = 0.7f) }
service.update<Settings.Keybinds> { it.copy(actions = it.actions + ("jump" to ActionBindings(Key(KEY_SPACE)))) }
```

**Why live-apply.** With the 2s debounce, a slider drag at 60Hz becomes one
disk write at release. No need for separate `update` / `preview` /
`apply` / `revert` methods, no Apply or Cancel button in the UI. UX
matches Apex / Valorant / Overwatch. If you ever want stage+commit
(Cyberpunk-style), bring back a `preview(transform)` that does
emit+engine-push without the debounced save, and gate `update` behind an
Apply button.

**Why `inline reified`.** Avoids reflection (which the godot-kotlin-jvm
KSP processor would have to consider) and gives clean call sites. Each
variant compiles to its own copy at the call site; for 4 variants the
code bloat is negligible.

## Persistence

JSON via `kotlinx.serialization`, written through Godot's `FileAccess`:

```kotlin
class ConfigManager {
    companion object { private const val TAG = "ConfigManager" }
    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true       // forward-compatible: new fields use defaults
        encodeDefaults = true
    }

    inline fun <reified T : Config> load(default: T): Result<T, LoadError> {
        val path = "user://${default.name}.json"
        if (!FileAccess.fileExists(path)) {
            save(default)              // first run — write defaults
            return Result.Success(default)
        }
        val file = FileAccess.open(path, FileAccess.ModeFlags.READ)
            ?: return Result.Error(LoadError.FileNotFound(path))
        val text = file.getAsText().also { file.close() }
        return runCatching { json.decodeFromString<T>(text) }
            .fold(
                onSuccess = { Result.Success(it) },
                onFailure = { e ->
                    Log.tag(TAG).e { "Parse error in $path: ${e.message}" }
                    Result.Error(LoadError.ParseError(e.message ?: "?"))
                },
            )
    }

    inline fun <reified T : Config> save(config: T): EmptyResult<SaveError> {
        val path = "user://${config.name}.json"
        val file = FileAccess.open(path, FileAccess.ModeFlags.WRITE)
            ?: return Result.Error(SaveError.CanNotWriteToFile(path))
        return runCatching {
            file.storeString(json.encodeToString(config))
            file.close()
        }.fold(
            onSuccess = { Result.Success(Unit) },
            onFailure = { e -> Result.Error(SaveError.GenericError(e)) },
        )
    }
}

interface Config { val name: String }

sealed interface LoadError {
    data class FileNotFound(val path: String) : LoadError
    data class ParseError(val message: String) : LoadError
}
sealed interface SaveError {
    data class CanNotWriteToFile(val path: String) : SaveError
    data class GenericError(val cause: Throwable) : SaveError
}
```

**Always overwrite.** Saving is `Json.encodeToString(state.value)` →
write. No diffing, no per-section files. Single source of truth, single
file.

**`ignoreUnknownKeys = true`** means adding new settings is forward-safe:
old `settings.json` files just use defaults for the new fields. Removing
or renaming a field requires a one-off migration step (read into a
schema-versioned wrapper or `JsonElement`, transform, re-save).

**`user://`** resolves to the OS-appropriate per-user data dir
(`~/.local/share/<app>/` on Linux, `%APPDATA%/<app>/` on Windows, the app
sandbox on iOS/macOS, app-specific storage on Android). Godot's
`FileAccess` handles all of this. Don't try to compute absolute paths
manually.

## Game state file

Separate file, same shape:

```kotlin
@Serializable
data class GameStateConfig(
    val saves: List<SaveSlot> = emptyList(),
    val unlocks: Set<String> = emptySet(),
    val playthroughs: Int = 0,
    // ...
) : Config {
    @Transient override val name: String = "gamestate"
}
```

`Reset Progress` button (in the Gameplay tab) shows a confirmation modal
("Type DELETE to confirm" if you want extra-destructive UX), then
`configManager.save(GameStateConfig())` — overwriting the file with
defaults. Settings stay untouched.

## Engine applier

The applier maps the data model to engine API calls. It owns a "last
applied" snapshot to diff against — no point calling
`AudioServer.setBusVolumeDb` if `master` didn't change.

```kotlin
class SettingsApplier(
    private val getRootViewport: () -> Viewport,
    private val getWorldEnvironment: () -> Environment?,
) {
    private var last: SettingsConfig? = null

    fun apply(new: SettingsConfig) {
        val prev = last
        if (prev?.audio != new.audio) applyAudio(new.audio)
        if (prev?.graphics != new.graphics) applyGraphics(new.graphics)
        if (prev?.gameplay != new.gameplay) applyGameplay(new.gameplay)
        if (prev?.keybinds != new.keybinds) applyKeybinds(new.keybinds)
        last = new
    }

    private fun applyAudio(a: Settings.Audio) {
        fun setBus(name: String, linear: Float) {
            val idx = AudioServer.getBusIndex(name)
            if (idx >= 0) AudioServer.setBusVolumeDb(idx, linearToDb(linear.coerceIn(0.0001f, 1f)))
        }
        setBus("Master", a.master)
        setBus("Music",  a.music)
        setBus("SFX",    a.sfx)
        setBus("Voice",  a.voice)
        setBus("Ambient", a.ambient)
        setBus("UI",     a.ui)
        if (AudioServer.getOutputDevice() != a.outputDevice) AudioServer.setOutputDevice(a.outputDevice)
    }

    private fun applyGraphics(g: Settings.Graphics) {
        DisplayServer.windowSetSize(Vector2i(g.resolution.width, g.resolution.height))
        DisplayServer.windowSetMode(g.windowMode.toGodot())
        DisplayServer.windowSetVsyncMode(g.vsync.toGodot())
        Engine.maxFps = g.fpsCap

        val vp = getRootViewport()
        vp.msaa3d = g.antiAliasing.toMsaa()
        vp.screenSpaceAa = g.antiAliasing.toScreenSpaceAa()
        vp.useTaa = g.antiAliasing == AntiAliasing.TAA
        vp.useHdr2d = g.hdr

        getWorldEnvironment()?.let { env ->
            env.ssaoEnabled = g.ssao
            env.ssrEnabled = g.ssr
            env.glowEnabled = g.bloom
            env.volumetricFogEnabled = g.volumetricFog
            env.adjustmentBrightness = g.brightness
        }
    }

    private fun applyGameplay(g: Settings.Gameplay) {
        TranslationServer.setLocale(g.language)
        // FOV / shake are applied by the camera / gameplay nodes that
        // observe `service.state.map { it.gameplay }`. The applier doesn't
        // know which camera is active.
    }

    private fun applyKeybinds(k: Settings.Keybinds) {
        for ((action, bindings) in k.actions) {
            if (!InputMap.hasAction(action)) continue
            InputMap.actionEraseEvents(action)
            bindings.primary?.toGodotEvent()?.let { InputMap.actionAddEvent(action, it) }
            bindings.secondary?.toGodotEvent()?.let { InputMap.actionAddEvent(action, it) }
        }
    }
}

private fun linearToDb(linear: Float): Float = (20.0 * kotlin.math.log10(linear.toDouble())).toFloat()
```

**Gameplay-applied-by-observation.** The applier doesn't push FOV /
camera shake to the camera — those are gameplay state. The active
`Camera3D` node observes `service.state.map { it.gameplay }` itself and
applies. Keeps the applier free of "find the camera in the scene tree"
logic.

**`InputBinding.toGodotEvent()`.** Each variant builds the matching
`InputEventKey` / `InputEventMouseButton` / `InputEventJoypadButton` /
`InputEventJoypadMotion`. Use `physicalKeycode` (not `keycode`) for
layout independence on `InputEventKey`.

## UI layer

Each tab is a `Control` node binding `service.state.map { it.<tab> }` and
calling `service.update<Settings.X> { it.copy(...) }` on user input.
Driver pattern:

```kotlin
@RegisterClass
class AudioTab : Control() {
    private val scope = NodeScope()
    private lateinit var service: SettingsService
    private lateinit var masterSlider: HSlider

    @RegisterFunction
    override fun _ready() {
        masterSlider = getNode("MasterSlider") as HSlider
        masterSlider.valueChanged.connect { v ->
            service.update<Settings.Audio> { it.copy(master = v.toFloat()) }
        }
        scope.launch {
            service.state.map { it.audio.master }.distinctUntilChanged().collect {
                if (masterSlider.value != it.toDouble()) masterSlider.value = it.toDouble()
            }
        }
    }

    @RegisterFunction
    override fun _exitTree() { scope.cancel() }
}
```

The `masterSlider.value != it.toDouble()` guard prevents a feedback loop
when the flow update is what *caused* the slider value to change.

**Preview content per tab:**

| Tab | Preview |
|-----|---------|
| Audio | Per-bus `AudioStreamPlayer` with bus-appropriate test clip (UI click for UI bus, gunshot for SFX, music sting for Music, NPC line for Voice, ambient loop for Ambient). Slider release plays the clip once. |
| Graphics | Inline `SubViewport` showing a `graphics_preview.tscn` scene (rotating PBR model, shadow-casting light, reflective surface, SSAO-exposing geometry, particles, optional fog). Sized ~400×225 inline above the controls. Set `renderTargetUpdateMode = WHEN_VISIBLE` to stop wasting GPU when the tab isn't active. |
| Gameplay | FOV slider → apply to the SubViewport's camera if visible. Difficulty / reset progress have no engine preview. |
| Keybinds | Rebound action briefly flashes/animates in the UI on capture. |

## Keybind rebind capture

The Keybinds tab enters a transient "listening" state when the user
clicks a binding slot. A node with `_input` captures the next input
event, builds an `InputBinding`, and emits the update. Esc cancels.

```kotlin
@RegisterClass
class KeybindRow : HBoxContainer() {
    private val scope = NodeScope()
    lateinit var service: SettingsService
    lateinit var actionName: String
    var slot: Slot = Slot.PRIMARY

    private var listening = false

    fun startListen(s: Slot) { slot = s; listening = true; setProcessInput(true) }

    @RegisterFunction
    override fun _input(event: InputEvent) {
        if (!listening) return
        val binding = when (event) {
            is InputEventKey -> {
                if (event.keycode == Key.ESCAPE) { listening = false; setProcessInput(false); return }
                if (!event.pressed) return
                InputBinding.Key(physicalKeycode = event.physicalKeycode.id.toInt(), mods = event.mods())
            }
            is InputEventMouseButton -> {
                if (!event.pressed) return
                InputBinding.Mouse(button = event.buttonIndex.id.toInt())
            }
            is InputEventJoypadButton -> {
                if (!event.pressed) return
                InputBinding.JoyButton(button = event.buttonIndex.id.toInt())
            }
            is InputEventJoypadMotion -> {
                if (kotlin.math.abs(event.axisValue) < 0.5f) return
                InputBinding.JoyAxis(axis = event.axis.id.toInt(), direction = event.axisValue.toInt().coerceIn(-1, 1))
            }
            else -> return
        }
        listening = false; setProcessInput(false)
        service.update<Settings.Keybinds> { current ->
            val existing = current.actions[actionName] ?: ActionBindings()
            current.copy(actions = current.actions + (actionName to when (slot) {
                Slot.PRIMARY -> existing.copy(primary = binding)
                Slot.SECONDARY -> existing.copy(secondary = binding)
            }))
        }
    }

    enum class Slot { PRIMARY, SECONDARY }
}
```

Conflict detection: before applying, walk `current.actions` for any other
action whose primary or secondary equals `binding`. Decide policy
(replace the conflicting binding silently, warn, or refuse).

## Graphics preset

Preset is *derived*, not stored. The data model only has the individual
fields. The UI computes the current preset by comparing against known
preset bundles:

```kotlin
enum class GraphicsPreset {
    LOW, MID, HIGH, MAX, CUSTOM;

    companion object {
        val LOW_BUNDLE  = Settings.Graphics(textureQuality = Quality.LOW,  shadowQuality = Quality.LOW,  antiAliasing = AntiAliasing.OFF, anisotropic = 1,  ssao = false, ssr = false, bloom = false, volumetricFog = false, viewDistance = 0.5f)
        val MID_BUNDLE  = Settings.Graphics(textureQuality = Quality.MID,  shadowQuality = Quality.MID,  antiAliasing = AntiAliasing.FXAA, anisotropic = 4,  ssao = true,  ssr = false, bloom = true,  volumetricFog = false, viewDistance = 0.75f)
        val HIGH_BUNDLE = Settings.Graphics(textureQuality = Quality.HIGH, shadowQuality = Quality.HIGH, antiAliasing = AntiAliasing.MSAA_4X, anisotropic = 16, ssao = true, ssr = true, bloom = true, volumetricFog = false, viewDistance = 1f)
        val MAX_BUNDLE  = Settings.Graphics(textureQuality = Quality.MAX,  shadowQuality = Quality.MAX,  antiAliasing = AntiAliasing.TAA,    anisotropic = 16, ssao = true, ssr = true, bloom = true, volumetricFog = true,  viewDistance = 1f)
    }
}

fun Settings.Graphics.detectPreset(): GraphicsPreset = when (this.qualityFields()) {
    GraphicsPreset.LOW_BUNDLE.qualityFields()  -> GraphicsPreset.LOW
    GraphicsPreset.MID_BUNDLE.qualityFields()  -> GraphicsPreset.MID
    GraphicsPreset.HIGH_BUNDLE.qualityFields() -> GraphicsPreset.HIGH
    GraphicsPreset.MAX_BUNDLE.qualityFields()  -> GraphicsPreset.MAX
    else -> GraphicsPreset.CUSTOM
}
```

`qualityFields()` returns a tuple of just the quality-relevant fields
(excluding display fields like resolution/window mode that aren't part
of "quality"). Selecting a preset from the dropdown copies the bundle's
quality fields onto the current `Settings.Graphics`, preserving display
fields. Modifying any individual slider results in the dropdown flipping
to "Custom" automatically on next render — no special handling needed.

## Cross-platform UX

| Setting | PC | Mobile (Android / iOS) |
|---|---|---|
| Window mode dropdown | Fullscreen / Borderless / Windowed | Hide row (always fullscreen) |
| Monitor select | Multi-monitor dropdown | Hide row (single screen) |
| Resolution dropdown | Free choice | Hide row; offer render-scale slider |
| VSync modes | All 4 | On / Off only |
| Output audio device | Full list | Often hide or single entry |
| HDR | If display supports | Platform-dependent |
| FPS cap presets | 30 / 60 / 120 / 144 / Unlimited | 30 / 60 / 90 / 120 max per device |

Detection: `OS.getName()` returns `"Windows" | "Linux" | "macOS" | "Android" | "iOS"`.
Or `OS.hasFeature("mobile")` for the binary PC-vs-mobile split. Tabs
should render conditionally on `OS.hasFeature(...)`.

**Keybinds + controller binds stay visible on all platforms** — mobile
users with Bluetooth controllers / external keyboards (Steam Deck, iPad
+ keyboard, etc.) need them. Touch controls config is a separate feature
when/if it lands.

## Reuse from FromWau/KmpTemplate

The template's `Logger` and `ConfigManager` are designed for KMP
(`expect`/`actual`, `SystemAppDirectories`, `kotlinx.io`, ktoml). Strip
all of that — godot-kotlin-jvm is JVM-only and Godot's APIs handle the
platform abstraction.

| Template piece | Keep / drop in Godot |
|---|---|
| `Logger` abstract class + `expect val Log` | Drop `expect`. Single `object Log` (or class). |
| `Logger.jvm.kt` calling `println` | Replace with `GD.print` / `GD.pushWarning` / `GD.pushError`. |
| `SystemAppDirectories` | Drop. Just use `"user://..."` paths in `FileAccess.open`. |
| `kotlinx.io.files.SystemFileSystem` | Drop. Use Godot's `FileAccess`. |
| `kotlinx.atomicfu.locks.reentrantLock` | Drop. Use `java.util.concurrent.locks.ReentrantLock` or `synchronized`. |
| Buffered-until-init log queue | Keep — settings load before logger init is real. |
| Tagged logger pattern (`Log.tag("Audio").i { ... }`) | Keep — useful. |
| Lazy `() -> String` message blocks | Keep — avoids string construction when level is filtered out. |
| `ConfigManager` `Result<T, Error>` types | Keep — typed errors > exceptions for UI surfacing. |
| `ConfigManager` ktoml + `toToml()` | Drop. Use `Json.encodeToString(value)` directly. |
| `Config` interface | Keep, but shrink to just `val name: String`. |
| File extension `.toml` | Change to `.json`. |

**ANSI colors in logs** — Godot's Output panel renders them as garbage
(`[31m...`). Drop the color logic, or replace with
`GD.printRich("[color=yellow]…[/color]")` for BBCode formatting, or rely
on the `pushWarning`/`pushError` visual distinction (they show in
red/yellow + the Errors tab automatically).

**Logger output split:**
```kotlin
when (entry.level) {
    LogLevel.ERROR -> GD.pushError(text)   // red + Errors tab
    LogLevel.WARN  -> GD.pushWarning(text) // yellow + Errors tab
    else           -> GD.print(text)        // Output panel only
}
```

## Layout

```
src/main/kotlin/com/yourgame/
  core/
    config/
      Config.kt              interface { val name: String } + LoadError/SaveError
      ConfigManager.kt       inline reified load/save<T : Config>
    logger/
      Logger.kt              object Log, TaggedLogger, LogEntry, buffered-init
    result/
      Result.kt              Success/Error sealed type
  settings/
    Settings.kt              sealed interface + 4 data classes
    SettingsConfig.kt        the bundle wrapper
    InputBinding.kt          sealed for keybinds
    enums/                   Difficulty, Quality, AntiAliasing, WindowMode, VSyncMode, Resolution
    GraphicsPreset.kt        LOW/MID/HIGH/MAX bundles + detectPreset()
    SettingsService.kt       state + update<T> + debounced save
    SettingsApplier.kt       diff-and-push to AudioServer / DisplayServer / ...
    ui/
      SettingsMenu.kt        @RegisterClass Control, tab switching
      tabs/
        AudioTab.kt
        GraphicsTab.kt
        GameplayTab.kt
        KeybindsTab.kt
      KeybindRow.kt          rebind capture
      GraphicsPreview.kt     SubViewport wrapper
  gamestate/
    GameStateConfig.kt       separate "gamestate.json"
```

## Pitfalls

- **Slider feedback loops.** When the flow pushes a new value to the
  slider, the slider's `valueChanged` signal fires and would call
  `service.update` again. Guard with `if (slider.value != newValue)
  slider.value = newValue` before applying, and accept that the first
  user drag triggers exactly one redundant `update` (harmless — the
  applier diff catches it).
- **`AudioServer.getBusIndex(name)` returns -1 for missing buses.** If
  someone renames a bus in the editor without updating the applier, the
  setting silently does nothing. Log a warning when `idx < 0` instead of
  ignoring.
- **`Environment` is a Resource shared across scenes.** Mutating it
  changes every viewport using it. If your menu's `SubViewport` preview
  needs its own environment, duplicate the Resource for the preview.
- **`prettyPrint = true`** can produce slightly different output across
  kotlinx-serialization versions (whitespace tweaks). Don't use the
  config file as a "diffable artifact" tracked in git — it's a runtime
  output.
- **Migration.** `ignoreUnknownKeys` covers *adding* fields. *Removing*
  or *renaming* a field needs a one-off migration: load as `JsonElement`,
  transform, save. Tag every major release with a schema version
  (`@SerialName` doesn't help; add a `val schemaVersion: Int = 1` to
  `SettingsConfig` and gate migration steps off it).
- **Debounce window during shutdown.** If the user changes a setting at
  T-1.9s and quits at T-2.0s, the 2s debounce hasn't fired yet — the
  change is lost. Hook the menu's `_exitTree` (or the game's quit
  signal) to force-flush: `_state.value.let { configManager.save(it) }`.
- **`OS.hasFeature("mobile")`** is true on both Android and iOS. If you
  need to distinguish, use `OS.getName()`.
