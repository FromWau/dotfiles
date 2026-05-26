# Steam publishing

How to ship a godot-kotlin-jvm game on Steam and use the Steamworks API.
Read this when starting Steam integration — the path is non-obvious
because godot-kotlin-jvm is a custom Godot fork and so is the de-facto
Godot+Steam integration (GodotSteam), so the standard advice doesn't
apply.

## The forks-collide problem

godot-kotlin-jvm requires Utopia Rise's custom Godot binary (the
official binaries don't load Kotlin). GodotSteam ships as either:

- a **module form** that requires its own custom Godot binary (built
  with the Steam module compiled in), or
- a **GDExtension form** targeting *stock* Godot 4.4+ (its maintainer
  states module and GDExtension versions are not compatible with each
  other).

You can only run one custom Godot binary at a time. Neither GodotSteam
path stacks with the utopia-rise fork. As of this writing, zero
community work exists on a merged fork (verified via GitHub issue
search of both repos for "steam"/"steamworks"/"kotlin").

**Realistic integration path: bypass GodotSteam entirely and call
Steamworks directly from Kotlin via steamworks4j (JNI).**

## Why steamworks4j

It's a thin JVM wrapper around the Steamworks C++ SDK, published as a
plain JAR on Maven Central. Since godot-kotlin-jvm runs on a JVM, you
add it as a Gradle dependency and call it from your Kotlin code — no
plugins, no fork merging, no GDExtension. Trade-offs:

- Doesn't wrap every Steamworks interface — older or niche additions
  (Timeline, recent Workshop bits) may be missing. PRs welcome upstream.
- 541 stars, maintained but not hyperactive.
- No maintained alternative exists. References across JVM gaming
  communities all point back to steamworks4j.
- Watch [Kanama](https://forum.godotengine.org/t/kanama-experimental-kotlin-scripting-for-godot-through-gdextension-jvm/138955)
  as a future-proof alternative — it's experimental Kotlin-on-Godot via
  GDExtension against *stock* Godot, which would (in principle) unlock
  GodotSteam without any fork-merging. 0.1.0 preview today; not
  production-ready.

## JVM-only Kotlin — no KMP

godot-kotlin-jvm targets Windows / Linux / macOS / Android / iOS, all
from a **single JVM source set**. steamworks4j is also JVM-only. So
your Kotlin code stays in one `src/main/kotlin/` — no `expect`/`actual`,
no commonMain/jvmMain split, no platform-specific source sets.

The platform difference is purely **runtime**: Steamworks SDK exists
only for desktop (Windows / Linux / macOS). Mobile builds (Android /
iOS) have no Steam process to talk to.

| Target | Steamworks | Ships |
|---|---|---|
| Windows x64 | ✅ | game JAR + JRE + `steam_api64.dll` + steamworks4j |
| Linux x64 | ✅ | game JAR + JRE + `libsteam_api.so` + steamworks4j |
| macOS (x64+arm64) | ✅ | game JAR + JRE + `libsteam_api.dylib` + steamworks4j |
| Android | ❌ | game JAR + JRE only |
| iOS | ❌ | game JAR + JRE only |

## Per-target packaging via Godot Export Presets

Configure one preset per target in `Project Settings → Export`. Use the
"Files to exclude" / "Resources" filter to pick which native libs ship
per platform. The Kotlin JAR is identical across all five.

```
Export Presets:
  Windows Desktop  → include lib/win/steam_api64.dll, embed JAR
  Linux/X11        → include lib/linux/libsteam_api.so, embed JAR
  macOS            → include lib/macos/libsteam_api.dylib, embed JAR
  Android          → embed JAR only
  iOS              → embed JAR only
```

Optionally exclude the steamworks4j JNI shim libraries from
Android/iOS exports to slim the APK/IPA — cosmetic, since they don't
load on mobile anyway.

## Code architecture: interface + factory

Gate Steam behind an interface so call sites are platform-agnostic.
JVM class loading is lazy by default, so referencing
`SteamworksService` only triggers JNI loading when it's instantiated —
mobile builds that never construct it pay no cost.

```kotlin
interface SteamService {
    val isAvailable: Boolean
    fun unlockAchievement(id: String)
    fun openLobby(maxPlayers: Int)
    val onLobbyJoined: Flow<LobbyId>
    // ...
}

object SteamServiceFactory {
    fun create(): SteamService =
        if (OS.hasFeature("pc")) {
            try {
                SteamworksService().also { it.init() }
            } catch (e: Throwable) {
                Log.tag("Steam").w { "Steam unavailable: ${e.message}" }
                NoOpSteamService()
            }
        } else {
            NoOpSteamService()
        }
}
```

The `try/catch` also covers the second important case: **PC builds
running without Steam** — itch.io, GOG, dev launches without
`steam_appid.txt`, players running the binary directly. You want that
gate even on desktop.

## steamworks4j usage pattern

steamworks4j is callback-driven (it mirrors the C++ API's listener
pattern). Each interface (`SteamUserStats`, `SteamMatchmaking`,
`SteamFriends`, etc.) takes a callback object in its constructor and
emits events via interface methods.

```kotlin
import com.codedisaster.steamworks.*

class SteamworksService : SteamService {
    companion object { private const val TAG = "Steam" }

    private lateinit var userStats: SteamUserStats
    private lateinit var matchmaking: SteamMatchmaking
    private lateinit var friends: SteamFriends

    override val isAvailable: Boolean get() = SteamAPI.isSteamRunning()

    fun init(): Boolean = try {
        SteamAPI.loadLibraries()
        if (!SteamAPI.init()) {
            Log.tag(TAG).w { "SteamAPI.init failed (no Steam process / wrong app id)" }
            false
        } else {
            userStats   = SteamUserStats(userStatsCallback)
            matchmaking = SteamMatchmaking(matchmakingCallback)
            friends     = SteamFriends(friendsCallback)
            true
        }
    } catch (e: SteamException) {
        Log.tag(TAG).e(e) { "Steam init failed" }
        false
    }

    fun pump() = SteamAPI.runCallbacks()       // every frame
    fun shutdown() { SteamAPI.shutdown() }

    private val userStatsCallback = object : SteamUserStatsCallback {
        override fun onUserStatsReceived(gameId: Long, steamID: SteamID, result: SteamResult) {}
        override fun onUserStatsStored(gameId: Long, result: SteamResult) {}
        override fun onAchievementStored(gameId: Long, isGroup: Boolean, name: String, curProgress: Int, maxProgress: Int) {}
        override fun onUserStatsUnloaded(steamID: SteamID) {}
    }
    // matchmakingCallback, friendsCallback similarly — implement all methods,
    // route into Flows/SharedFlows for Kotlin-idiomatic consumption.

    override fun unlockAchievement(id: String) {
        userStats.setAchievement(id)
        userStats.storeStats()
    }
}
```

## Lifecycle: Godot autoload + frame pump

`SteamAPI.runCallbacks()` must be called roughly every frame to dispatch
incoming events to your listeners. The natural place is a Godot
autoload (singleton node) whose `_process` pumps the service.

```kotlin
@RegisterClass
class SteamAutoload : Node() {
    private val service: SteamService = SteamServiceFactory.create()

    @RegisterFunction
    override fun _enterTree() { /* init already happened in factory */ }

    @RegisterFunction
    override fun _process(delta: Double) {
        (service as? SteamworksService)?.pump()
    }

    @RegisterFunction
    override fun _exitTree() {
        (service as? SteamworksService)?.shutdown()
    }
}
```

Register as autoload in `Project Settings → AutoLoad`, name e.g.
`Steam`, scene path your generated `.gdj`. Now accessible globally and
guaranteed to live for the whole game session.

## Gradle dependency

```kotlin
// gradle/libs.versions.toml
[versions]
steamworks4j = "1.9.0"

[libraries]
steamworks4j = { module = "com.code-disaster.steamworks4j:steamworks4j", version.ref = "steamworks4j" }

// build.gradle.kts
dependencies {
    implementation(libs.steamworks4j)
}
```

The Steam SDK native libraries (`steam_api64.dll`, `libsteam_api.so`,
`libsteam_api.dylib`) come separately from the [Steamworks SDK
download](https://partner.steamgames.com/downloads/steamworks_sdk.zip)
— check them into `lib/{win,linux,macos}/` in the project and have
Godot's Export Presets include the right one per target.

## Custom SteamLibraryLoader

steamworks4j ships with `gdx` and `lwjgl3` library loaders out of the
box (it expects the natives in libGDX or LWJGL3 layout). godot-kotlin-jvm
has a different working dir at runtime — the JAR + JRE + Godot
executable layout is its own thing. Write a tiny custom loader to find
the natives next to your executable:

```kotlin
class GodotSteamLibraryLoader : SteamSharedLibraryLoader.LibraryLoader {
    override fun loadLibrary(libraryName: String): String? {
        // Resolve "user://" or executable-relative path to the bundled native
        val absolute = ProjectSettings.globalizePath("res://lib/${osArchDir()}/$libraryName")
        System.load(absolute)
        return absolute
    }

    private fun osArchDir() = when (OS.getName().lowercase()) {
        "windows" -> "win"
        "linux"   -> "linux"
        "macos"   -> "macos"
        else      -> error("Unsupported OS for Steam: ${OS.getName()}")
    }
}

// Before SteamAPI.loadLibraries():
SteamSharedLibraryLoader.setLibraryLoader(GodotSteamLibraryLoader())
```

The exact API surface for setting the loader has shifted across
steamworks4j versions — check the [steamworks4j getting-started
docs](https://code-disaster.github.io/steamworks4j/getting-started.html)
against the version you're on.

## Steamworks API surfaces

What each Steamworks interface gives you. All accessible via
steamworks4j (mostly — niche ones may need a PR upstream).

| Surface | Interface | What you get |
|---|---|---|
| Achievements + stats | `ISteamUserStats` | `SteamUserStats` — set/get achievements, per-player stats |
| Leaderboards | `ISteamUserStats` | Same interface — `findOrCreateLeaderboard`, `uploadLeaderboardScore` |
| Friends + overlay + rich presence | `ISteamFriends` | `SteamFriends` — friends list, invites, overlay activation, presence strings |
| Controller (Steam Input) | `ISteamInput` | `SteamController` (legacy) — action sets, controller-agnostic input, glyphs |
| Multiplayer (modern) | `ISteamNetworkingSockets` | P2P sockets with reliable + unreliable lanes |
| Multiplayer (lobbies) | `ISteamMatchmaking` | `SteamMatchmaking` — lobby creation, search, member lists, chat |
| Multiplayer (dedicated servers) | `ISteamGameServer` | `SteamGameServer` — register server, master server queries |
| Modding / UGC | `ISteamUGC` | `SteamUGC` — upload/download/subscribe Workshop items |
| Cloud saves | `ISteamRemoteStorage` | `SteamRemoteStorage` — per-user sync across machines |
| Voice chat | `ISteamUser` | `SteamUser` — voice capture + decoding |
| Auth + ownership | `ISteamUser` / `ISteamApps` | Session tickets, DLC entitlement |
| Microtransactions | `ISteamInventory` | `SteamInventory` — item economy backend |
| Screenshots / Timeline / etc. | `ISteamScreenshots`, `ISteamTimeline` | Minor APIs — may not be wrapped in steamworks4j |

## Dev infrastructure

Everything at [partner.steamgames.com](https://partner.steamgames.com/).

| Thing | What it is |
|---|---|
| **Steamworks Partner registration** | Free. Sign up, submit company/individual info, tax forms (W-8 / W-9), bank info. 30-day waiting period before you can publish your first app. |
| **Steam Direct fee** | $100 USD per app submission. Recoupable after the game earns $1000 in adjusted gross revenue. Pay once per game. |
| **App ID** | Assigned after fee payment. Goes in `steam_appid.txt` for dev, into config for production builds. |
| **Spacewar (App ID 480)** | Valve's official public sandbox. Free, no fee. Use it to test API wiring without your own app ID. Limitation: achievements/stats are global to all Spacewar users — fine for testing API calls, not for testing your actual achievement design. |
| **Build pipeline (SteamPipe)** | `steamcmd` CLI uploads builds to depots via VDF scripts. From CI or local: `steamcmd +login partner +run_app_build build.vdf`. |
| **Branches** | `default` = public. Create `beta` / `staging` / `dev` etc. — opt-in via Steam client dropdown, optionally password-gated. Standard workflow: upload to `staging` → internal QA → promote to `default`. |
| **Closed playtests** | Steam Playtest feature: time-limited access granted to specific accounts. You distribute keys or auto-approve requests. |
| **Free dev keys** | ~250 free Steam keys for your own game to give press/testers/streamers. More on request. |
| **Demos** | Separate app ID, launches from your store page. Configure as "free demo" linked to main app. |
| **Achievements / stats / leaderboards** | Define schema on partner site, code uses `SteamUserStats` to mutate. |
| **Workshop** | Define UGC type on partner site (single file, folder, etc.). Code uses `SteamUGC` to upload/subscribe. |
| **Build review** | Valve reviews each new build ~5 business days before "release" promotion. Checks: launches, no malware, store page complete. Not nearly as strict as Apple. After approval, future builds promote essentially instantly. |
| **Steam Deck Verified** | Separate, deeper review — Input / Display / Seamlessness categories. Request after release. |

## Local testing flow

1. Register Steamworks partner account.
2. Pay $100, get app ID (or use Spacewar App ID 480 for early prototyping).
3. Install Steam, log in.
4. In your game build dir: place `steam_appid.txt` containing your app ID.
5. Run game from IDE / Godot. `SteamAPI.init()` finds running Steam process, connects. Achievements / friends / overlay all work.
6. For P2P / lobby testing: second Steam account on another machine, or Family Sharing to a test account.
7. When ready to ship: SteamPipe upload to `staging` branch → internal QA → promote to `default`.
8. Subsequent builds: incremental upload via SteamPipe, near-instant after Valve's first-time review.

**Important**: ship without `steam_appid.txt` in production. Steam launches the game and provides the app ID via process env. Shipping the txt file in production is harmless but smells dev-y.

## Steam Deck Verified

Official categories ([partner.steamgames.com/doc/steamdeck/compat](https://partner.steamgames.com/doc/steamdeck/compat)):

- **Input**: Full controller support, Deck/Xbox glyphs, on-screen keyboard for text entry. No mouse/keyboard-required UI.
- **Display**: 1280×800 native, ≥9 px text at that resolution (12 px recommended).
- **Seamlessness**: No "unsupported platform" prompts, launchers controller-navigable.

The docs make **no mention of Java/JRE restrictions**. Java runtime is invisible to verification — what matters is whether the binary launches and behaves under Steam Linux Runtime or Proton.

Practical for godot-kotlin-jvm:
- Prefer native Linux export over Proton — fewer layers, simpler debugging.
- Embedded JRE is fine if it doesn't show a Java console or audible startup warning.
- No public precedent for a godot-kotlin-jvm title going through Verified. First-mover territory.

## Pitfalls

- **Overlay rendering with utopia-rise fork** — the in-game Steam overlay (Shift+Tab) hooks the rendering pipeline. Works with stock Godot. Untested in public with godot-kotlin-jvm's fork. Be ready to file an issue with Utopia Rise if overlays glitch.
- **`steam_appid.txt` lingering in production builds** — harmless but unprofessional. Add a build-step exclusion or only place it in dev builds.
- **Forgetting to pump `runCallbacks`** — listeners never fire. Symptom: `setAchievement()` returns but `onAchievementStored` callback never arrives. Confirm the autoload's `_process` is running.
- **`SteamAPI.init()` race with Steam client startup** — if you launch the game before Steam has finished starting, `init()` returns false. Retry with backoff, or assume "Steam not available" and continue.
- **steamworks4j callback method explosion** — every listener interface has many methods you must implement (Java interface, no defaults across all versions). Stub out with no-ops for the ones you don't care about. Better: write Kotlin extension functions that map callbacks to `SharedFlow<T>` once per interface.
- **Cross-platform JRE bundling** — `jlink` can't cross-compile. Build each platform from its own host (Windows JRE on Windows, etc.) or use CI matrix runners.
- **Native lib path resolution under Godot** — `ProjectSettings.globalizePath("res://lib/...")` works in editor and packaged builds but verify with a smoke test on Windows + Linux + macOS before assuming. Path separators and case sensitivity bite here.
- **Spacewar app ID limits** — achievements you "unlock" on App ID 480 are visible to all Spacewar users and don't persist as yours. Useful for wiring tests, not for actual design validation.
- **`SteamAPI.runCallbacks()` and `pause()` modes** — Godot's `Engine.timeScale = 0` and pause-mode handling don't stop `_process` by default. Steam callbacks keep flowing during pause, which is fine — they're independent of game logic time.

## Sources

- [Steamworks API Overview](https://partner.steamgames.com/doc/sdk/api)
- [Steam Deck Compatibility Review](https://partner.steamgames.com/doc/steamdeck/compat)
- [Steam Deck and Proton](https://partner.steamgames.com/doc/steamdeck/proton)
- [steamworks4j repo](https://github.com/code-disaster/steamworks4j)
- [steamworks4j getting started](https://code-disaster.github.io/steamworks4j/getting-started.html)
- [steamworks4j on Maven Central](https://mvnrepository.com/artifact/com.code-disaster.steamworks4j)
- [GodotSteam](https://godotsteam.com/) (incompatible — for reference)
- [godot-kotlin-jvm exporting docs](https://github.com/utopia-rise/godot-kotlin-jvm/blob/master/docs/src/doc/user-guide/exporting.md)
- [Kanama forum announcement](https://forum.godotengine.org/t/kanama-experimental-kotlin-scripting-for-godot-through-gdextension-jvm/138955) (potential future alternative)
