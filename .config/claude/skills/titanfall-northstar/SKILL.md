---
name: titanfall-northstar
description: Titanfall 2 / Northstar mod development — `mod.json` structure, Squirrel patterns (`.nut`), Northstar log debugging, symlink deployment. Apply when editing `mods/<author>.<modname>/` or user mentions Titanfall, Northstar, TF2 modding, or Squirrel. Author: FromWau.
---

# Titanfall2 (TF2) — Northstar Modding

## Official Resources

- **Main Wiki**: https://docs.northstar.tf/Wiki/
- **Modding Docs**: https://docs.northstar.tf/Modding/guides/gettingstarted/
- **Squirrel Docs**: https://docs.northstar.tf/Modding/squirrel/
- **Template**: https://github.com/laundmo/northstar-mod-template
- **My Mods**: https://github.com/FromWau/CrouchKickFix

### Vanilla Squirrel/engine source to grep (authoritative references)
When you need a real function signature, callback, or RUI/HUD usage, search actual source
rather than guessing:
- **MP / core scripts** — the Northstar release zip (`Northstar.release.v*.zip` → `R2Northstar/
  mods/Northstar.{Client,CustomServers,Custom}/...`). `zipgrep`/`unzip -p`.
- **SP campaign + general vscripts** — [etsmit/sp_levels](https://github.com/etsmit/sp_levels)
  (unpacked vanilla single-player `.nut`/`.gnut` + map `.ent` data).
- **Native engine RE** (C++ side, for plugins) — see `references/native-hooks.md` "RE sources".

## Mod Directory Structure

```
mods/
└── YourName.ModName/
    ├── mod.json              # Main mod configuration
    ├── mod/
    │   └── scripts/
    │       └── vscripts/
    │           └── your_script.nut
    └── (optional: keyvalues/, resource/, etc.)
```

## mod.json Structure — CRITICAL RULES

### PATH SPECIFICATION

**NEVER include `mod/scripts/vscripts/` prefix in the Path field!**

```json
{
    "Name": "ModName",
    "Description": "What your mod does",
    "Version": "1.0.0",
    "LoadPriority": 1,
    "RequiredOnClient": true,
    "Authors": ["FromWau"],
    "Scripts": [
        {
            "Path": "your_script.nut",
            "RunOn": "CLIENT",
            "ClientCallback": {
                "Before": "InitFunctionName"
            }
        }
    ]
}
```

### Common Path Mistakes

```json
// WRONG — Will fail to load!
"Path": "mod/scripts/vscripts/script.nut"
"Path": "vscripts/script.nut"
"Path": "mod/script.nut"

// CORRECT
"Path": "script.nut"
```

### RunOn Expressions

Boolean expressions that control when/where scripts compile:

VM Contexts:
- `CLIENT` — Client-side code
- `SERVER` — Server-side code
- `UI` — UI/menu code

Game Modes:
- `SP` — Singleplayer
- `MP` — Multiplayer
- `LOBBY` — In lobby/menus
- `DEV` — Dev mode only

Examples:
```json
"RunOn": "CLIENT"                    // Client only
"RunOn": "CLIENT || SERVER"          // Both client and server
"RunOn": "CLIENT && MP"              // Client in multiplayer only
"RunOn": "( CLIENT || SERVER ) && MP" // Both, but only in MP
"RunOn": "CLIENT && !LOBBY"          // Client not in lobby
```

### Callbacks — Before vs After

```json
"ClientCallback": {
    "Before": "FunctionName",  // Called BEFORE map spawn
    "After": "FunctionName"    // Called AFTER map spawn
}
```

Use "Before" when: registering callbacks/hooks, setting up data structures
Use "After" when: need player entity to exist, spawning threads that track player

## Squirrel Script Patterns

### Basic Mod Init Pattern

```squirrel
global function ModName_Init

struct {
    bool isTracking = false
    var hudElement = null
} file

void function ModName_Init()
{
    AddCallback_OnClientScriptInit( ModName_OnClientInit )
}

void function ModName_OnClientInit( entity player )
{
    thread ModName_MainThread( player )
}
```

### CRITICAL: Squirrel Vector Syntax

**Vectors ALWAYS require 3 components!**

```squirrel
// WRONG
RuiSetFloat2( element, "msgPos", <0.7, 0.4> )

// CORRECT
RuiSetFloat2( element, "msgPos", <0.7, 0.4, 0> )
RuiSetFloat3( element, "msgColor", <1, 1, 1> )
```

### CRITICAL: Squirrel Struct and Function Patterns

- Use `global struct` for structs shared across files
- Declare `global function` at file top for exported functions
- File struct can only contain simple types (`int`, `float`, `bool`, `string`, `vector`, `var`, `array`, `table`)
- ClientCallback/ServerCallback functions take NO parameters — get player with `GetLocalClientPlayer()`
- Use `while (true)` for persistent threads, not `while (IsValid(player))`
- Functions with return types need explicit final return outside conditionals
- Multiple try-catch blocks in same function must be wrapped in `{}` scope blocks
- **ALWAYS add `untyped` as the first line of every .nut file**

### Threading Pattern

```squirrel
// CORRECT — Get fresh player each frame, survives map changes
void function MyThread()
{
    entity player
    while ( !IsValid( player ) )
    {
        player = GetLocalClientPlayer()
        WaitFrame()
    }

    while ( true )
    {
        player = GetLocalClientPlayer()
        if ( IsValid( player ) && IsAlive( player ) )
        {
            // Process player state...
        }
        WaitFrame()  // CRITICAL — prevents freeze
    }
}
```

## Gotchas (hard-won)

- **`split()` DROPS empty tokens.** `split("a||b", "|")` → `["a","b"]` (2 elems, not 3) — there are no empty fields. Any delimited/wire format that relies on a positional empty field between delimiters will shift indices and silently mis-parse. Put the meaningful field first or last and guard on `f.len()`. (This cost a crash: a command string leaked into a ConVar-name slot → `ConVar "..." is not valid`.)

- **`ClientCommand` is VM-specific, whitelist-gated, and can self-crash:**
  - **UI VM:** bare global — `ClientCommand("disconnect")` (see `menu_lobby.nut`).
  - **CLIENT VM:** it's a player **method** — `GetLocalClientPlayer().ClientCommand("...")` (see `cl_bubbles.nut`). The bare global is **undefined** in CLIENT → `COMPILE ERROR Undefined variable "ClientCommand"`.
  - **Whitelist-gated:** many commands (e.g. `fps_max`) silently no-op.
  - **Never run a VM-destroying command (`disconnect`, `map`) via `ClientCommand` from inside your own coroutine** — it tears down the VM/thread mid-call → native engine crash (no error dialog). Manual console `disconnect` is fine (not issued from a script coroutine). For arbitrary/engine commands, use a native plugin's `Cbuf_AddText` — see the `rrplug-northstar` skill.

- **"script not found or empty (scripts/vscripts/X.nut)"** while the mod still shows in the in-game list = `mod.json` loaded but the script path is wrong. Almost always the missing inner `mod/` dir — it must be `<mod>/mod/scripts/vscripts/X.nut` (see Mod Directory Structure), with `mod.json` `Path` as the bare filename.

- **`GetConVarString`/`SetConVarString` THROW on an unknown ConVar, and an uncaught throw kills the entire VM.** Symptom: `ConVar <name> is not valid` at `yourscript.nut #<line>` + the red "problem processing game logic" dialog, and the script stops running. There is no cheap non-throwing "does this cvar exist" check, so wrap every cvar touch in `try { ... } catch (e) {}` when the name is caller-supplied/dynamic. (Cost a VM crash from a single bad `get`.)

- **`reload_mods` does NOT reliably load a newly-added mod or recompile a running VM.** It re-reads mod files, but the active CLIENT VM keeps its old compiled scripts, and a freshly-symlinked mod often isn't picked up. After adding a mod or editing a script, re-enter a map (new CLIENT VM) or restart.

- **Northstar `global function`s are NOT in `getroottable()`.** They live in Northstar's own global namespace, so `"Foo" in getroottable()` is **always false** even when `Foo` exists and is callable — a guard like `("Foo" in getroottable()) ? Foo() : fallback` silently always takes the fallback. (Cost a bug: a cross-mod unit conversion was skipped every time, showing raw u/s.) To call a possibly-absent cross-mod global, either treat it as a hard dependency and call it directly (like everyone calls `ModSettings_*`), or wrap the direct call in `try { x = Foo() } catch (e) {}`. Cross-mod global calls themselves work fine (same VM/context); only the *existence check* via `getroottable()` is broken.

- **RUI HUD: wrong topology / too-early creation = "Argument 2 is not a RUI topology" → VM crash.** `RuiCreate($"ui/cockpit_console_text_top_left.rpak", clGlobal.topoFullScreen, RUI_DRAW_HUD, 0)` from a `Before`/init callback crashes — the topology isn't ready yet. Use the cockpit combo `clGlobal.topoCockpitHudPermanent` + `RUI_DRAW_COCKPIT` (last arg `-1`), and create the RUI **after a `WaitFrame()`** or **lazily once you're in a match** (e.g. on first use), not in the `Before` callback. (Pattern cribbed from `S2Mods.SpeedometerV2`'s `s2_speedometer.nut`, which is also the reference for a HUD speed readout + the `u/s → km/h ×0.091392` factor.)

- **One shared setting across mods > one per mod.** For cross-cutting prefs (units, etc.) make a tiny script-only "library mod" that owns the ModSettings entry + a `global function` API, and have other mods depend on it and call it. Example: `FromWau.Units` exposes `Units_ConvertSpeed(ups)` / `Units_SpeedSuffix()` (one "Speed Units" setting), so CrouchKickFix/MovementTrainer/etc. don't each add their own toggle. Declare it as a Thunderstore `dependencies` entry (must be published first) — `mod.json` has no inter-mod dependency field, so the dep is Thunderstore-manager-only; at runtime just ensure both are installed.

## Debugging & Testing

Logs: `~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs/`

```bash
# Validate mod.json syntax
jq . mods/FromWau.ModName/mod.json

# Check recent logs for errors
grep -i "error\|failed" ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs/nslog*.txt | tail -20
```

## Deployment

```bash
# Symlink for development
ln -s "$(pwd)/mods/FromWau.ModName" ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/mods/
```

## Author Convention

Always set author as **FromWau** in mod.json

## References (read on demand)

- `references/mod-template.md` — canonical mod structure, **naming conventions**
  (`Author.PascalModName`), `mod.json` template, dev workflow, and the
  what-needs-a-restart table. Start here when creating a new mod. **Install to
  `packages/` by default** (modern; only place that can bundle a native plugin) —
  package dir MUST be `Author-Mod-Version` (`[a-zA-Z0-9_]+-[a-zA-Z0-9_]+-\d+\.\d+\.\d+`,
  no dots/hyphens in author/mod) or it's silently skipped; `mods/` is classic-but-fine.
- `references/devbridge.md` — how to drive a running client via the
  **FromWau.DevBridge** HTTP bridge (`127.0.0.1:8723`): `/health` `/state` `/cmd`,
  the `get`/`set` (companion wire, in-match only) vs `exec` (native Cbuf, always)
  split, and the power techniques that ride on it — `script_client` (arbitrary
  client Squirrel, vanilla+), the `help` enumeration oracle, `format("%c",N)` byte
  injection, nslog capture, and chat read/write.
- `references/boot-hang.md` — **game won't launch** (Proton/EA-app boot-hang):
  how to confirm it's the EA handshake and NOT a mod (no fresh nslog), the healthy
  boot process sequence, and a least-destructive-first fix ladder (kill orphaned
  `gameoverlayui` → no-args bootstrap → clear EA caches → nuke prefix).
- `references/launch-args.md` — **`+`commands / trailing `-flags` don't apply on
  launch** (FPS counter off, `custom.cfg`/binds not loaded). The EA-app handoff
  **truncates the arg string**; fix is `ns_startup_args.txt` (Northstar appends it
  in-process via a `GetCommandLineA` hook, after the cut). Includes the
  `/proc/<pid>/cmdline` diagnostic.
- `references/native-hooks.md` — **detour a native engine function from an rrplug
  plugin** when no Squirrel hook exists. Worked example: send-side chat color by
  hooking `ClientSayText` (`engine.dll+0x54780`) with `retour::GenericDetour`
  (`static_detour!` needs nightly → use `GenericDetour` on stable). Recon pattern
  (Northstar.dll strings → launcher source → objdump verify), the FSU chat-color
  format the plugin emits, and the **foreground-only / bg+attributes-crash** rule.
  Also: **static RE with pefile+capstone** (xref a Squirrel script-function string →
  its registration → the native impl → the entity field offset it reads), the
  **verified TF2 offsets** (velocity / wall-run `player+0x249C<1.0` / local-player
  EHANDLE / bind table `engine+0x1396C5C0`), and the **`tf2-input` crate** (query
  input by action via the bind table, `VirtualQuery`-guarded — not by hardcoded key).
  For **calling Squirrel from a Rust plugin** (native→script push, `call_sq_function`
  + `SQVM_CLIENT`) see the `rrplug-northstar` skill.
- `references/thunderstore-publish.md` — **validate & fix a mod git repo for
  Thunderstore** + the release flow. Canonical layout (artifacts in a gitignored
  `build/`; the zip is a GitHub-release ASSET, never committed), the manifest.json
  rules (`name` `[A-Za-z0-9_]`≤128, `description`≤250, semver, 256×256 `icon.png`).
  Two runnable scripts: `scripts/check-thunderstore-repo.py <repo> [--fix]` (validate
  + fix) and `scripts/install.sh [repo] -p <profile>` (build → stage `build/` → zip →
  install into a profile; works for plugin and script-mod repos). **Mods carry no
  deploy script of their own — `install.sh` lives in the skill.**
- `references/keybinds.md` — **keybinds/input/cfg**: add bindable actions to the in-game
  keybinds menu via `kb_act.lst` (`"command" "Label"`, `"blank"` headers); the input verbs
  (jump = `+ability 3` in MP, NOT `+jump`); the spaced-command `+`/`-` alias trick;
  cfg gotchas (ASCII-only, lowercase letter binds, re-exec, alias-swap toggle idiom);
  and `ClientCommand("bind …")` for script-driven rebinds.

## Chat capabilities (this build, verified 2026-06)

- **Send:** `say` (public) / `say_team` (team), client-side, rate-limited
  `sv_max_chat_messages_per_sec=5` (drops extras, no kick). No client whisper —
  whisper is server-side only (`Chat_PrivateMessage` / `NSBroadcastMessage` WHISPER).
- **Receive hook:** `AddCallback_OnReceivedSayTextMessage( ClClient_MessageStruct
  functionref(ClClient_MessageStruct) )` — a *modify* hook (return the struct;
  set `shouldBlock=true` to hide). Struct fields: `message, player, playerName,
  isTeam, isDead, isWhisper, shouldBlock, noServerTag`. **No outgoing/send hook
  exists** — the chat box → native `say` is unhookable from script; only a native
  plugin detour could intercept sending.
- **Color = ANSI escape codes** (`\x1b[<n>m`), NOT Source `\x03/\x07` codes (those
  are stripped). Works locally AND survives `say` to the network. **FOREGROUND ONLY**
  is safe — verified rendering: basic `30-37`, bright `90-97`, reset `0`, Northstar
  specials `110-113` (110 chat, 111 friendly, 112 enemy, 113 network), 8-bit
  `38;5;X`, and 24-bit `38;2;r;g;b`. **24-bit RGB: any channel at 255 forces white**
  (`255;128;0`→white, `254;128;0`→orange) — cap channels at ≤245 (as Server Utilities
  does). **⚠️ Background (`40-47`/`100-107`/`48;…`) and attribute (`1-9`:
  bold/dim/italic/underline/blink/reverse/strikethrough) codes do NOT render AND
  hard-crash/freeze the game — never emit them.** Build ESC in-VM with `format("%c",27)`.
- **Server-side chat framework** (Server Utilities, `fscc_core.nut`): a `!command`
  parser is just the server's `AddCallback_OnReceivedSayTextMessage` checking a
  prefix, dispatching to registered callbacks, replying via `Chat_ServerPrivateMessage`
  (= whisper), optionally `shouldBlock`-ing the trigger. Client-side you can mimic it
  (read via ChatEvents → reply via `say`), but only public replies, no whisper, no block.
- **Charset:** UTF-8 clean pipe, but the chat font only has glyphs for ASCII +
  Latin-1 accents (`é ñ ü ß`). Symbols/CJK/emoji transmit fine but render as `?`.
