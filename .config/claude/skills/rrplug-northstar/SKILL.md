---
name: rrplug-northstar
description: Rust native plugins for R2Northstar (Titanfall 2) via the rrplug framework — Linux→Windows cross-compile, `Cargo.toml` setup, `Plugin` trait template. For protected ConVars, engine hooks, or low-level work; most Northstar tasks work in Squirrel alone.
---

# Rust Plugins with rrplug (Northstar)

## Overview

[rrplug](https://github.com/R2NorthstarTools/rrplug) is a Rust framework for creating native plugins for R2Northstar (Titanfall 2).

**Official Docs:** https://docs.rs/rrplug/

## When You Actually Need a Plugin

**Most tasks can be done in Squirrel alone!** Test with `SetConVarInt()`, `GetConVarInt()`, `SetConVarFloat()`, `GetConVarFloat()` before building a plugin.

**DO create a plugin for:** protected ConVars, engine-level hooks not in Squirrel, performance-critical ops, low-level memory access.

## Cross-Compilation Setup (Linux → Windows)

```bash
rustup target add x86_64-pc-windows-gnu
sudo pacman -S mingw-w64-gcc
```

**.cargo/config.toml** — set ONLY the cross-linker. Do NOT add a global `[build] target = ...`: if you do, `cargo test` cross-compiles your unit tests to a Windows binary that can't run on Linux. Pass `--target` explicitly when building the DLL instead (see Building), so `cargo test` stays on the host.
```toml
[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-ar"
```

**Cargo.toml:**
```toml
[lib]
crate-type = ["cdylib"]      # add "rlib" too if this crate also holds unit tests

[dependencies]
rrplug = "4.3"               # 4.3.0 verified 2026-06; the old "0.4" API differs a lot
log = "0.4"
```

**Tip — keep testable logic OUT of the plugin crate.** `rrplug` only compiles for Windows, so `cargo test` cannot build any crate that depends on it. Put pure logic (parsing, state, HTTP routing, etc.) in a separate workspace crate with no `rrplug` dependency — that one is host-testable with plain `cargo test` — and keep the `rrplug` cdylib a thin glue layer that calls into it.

## Basic Plugin Template

```rust
use rrplug::prelude::*;

#[derive(Debug)]
pub struct MyPlugin;

impl Plugin for MyPlugin {
    const PLUGIN_INFO: PluginInfo = PluginInfo::new(
        c"My Plugin",   // display name
        c"MYPLUGIN9",   // log tag (appears as [MYPLUGIN9]) — MUST be EXACTLY 9 chars; a const assert fails the build otherwise
        c"MY_PLUGIN",   // internal/dependency name
        PluginContext::CLIENT,
    );

    fn new(reloaded: bool) -> Self {
        register_sq_functions(my_squirrel_function);
        Self
    }

    // Optional: runs every frame ON THE GAME THREAD — the only safe place to
    // touch engine state / run Cbuf_AddText. Takes &self, so share state via
    // Arc<Mutex<..>> fields or a static OnceLock.
    // fn runframe(&self, _token: EngineToken) { ... }
}

// sqfunctions are free functions. Bare return types work (preferred):
//   -> String   for a value,   no return   for void.
// Result<T, String> also works if the call can fail.
#[rrplug::sqfunction(VM = "CLIENT", ExportName = "MySquirrelFunction")]
fn my_squirrel_function(message: String) -> String {
    format!("Received: {}", message)
}

entry!(MyPlugin);
```

### Gotchas (verified against rrplug 4.3.0, 2026-06)

- **log tag must be exactly 9 chars** — the 2nd `PluginInfo::new` arg. Off-by-one fails to compile via a `const` assertion.
- **`new(reloaded: bool)` runs at load; `runframe(&self, EngineToken)` runs every frame on the TF2 thread** (default impl is a no-op). Do all engine interaction in `runframe`; never touch game memory from a background thread you spawned.
- **Sharing state with sqfunctions:** sqfunctions are standalone free functions, so they can't see `&self`. Use a `static SHARED: OnceLock<Arc<...>>` set in `new()`.
- **`c"..."` C-string literals** need edition 2021+. If they don't resolve, use a `core::ffi::CStr` const.
- **A plugin statically links its crate(s).** Any change to a workspace crate the plugin depends on changes the DLL — you MUST rebuild + redeploy + **restart the game** (plugins don't hot-reload). Symptom of a stale DLL: the running plugin rejecting input the source already supports.

## Running console commands natively (Cbuf_AddText)

Squirrel `ClientCommand` is whitelist-gated and crashes on VM-destroying commands (see `titanfall-northstar`). To run ANY console command reliably (`disconnect`, `map`, `reload_mods`, ConVar sets), call the engine command buffer from the plugin. Offsets verified against the last-patch `engine.dll` (from NorthstarLauncher source):

```rust
use rrplug::offset_functions;
use std::ffi::{c_char, CString};

// engine.dll RVAs: Cbuf_AddText 0x1203B0, Cbuf_Execute 0x1204B0, Cbuf_GetCurrentPlayer 0x120630
offset_functions! {
    ENGINE_CBUF + EngineCbuf for WhichDll::Engine => {
        cbuf_get_current_player = unsafe extern "C" fn() -> i32 where offset(0x120630);
        cbuf_add_text           = unsafe extern "C" fn(i32, *const c_char, i32) where offset(0x1203B0);
        cbuf_execute            = unsafe extern "C" fn() where offset(0x1204B0);
    }
}

// In the Plugin impl:
fn on_dll_load(&self, _e: Option<&EngineData>, dll_ptr: &DLLPointer, _t: EngineToken) {
    unsafe { EngineCbuf::try_init(dll_ptr, &ENGINE_CBUF) };   // no-ops for non-engine dlls
}

fn runframe(&self, _t: EngineToken) {            // game thread — the ONLY safe place
    let Some(f) = ENGINE_CBUF.get() else { return };
    // drain your queued command strings, then for each `cmd`:
    let Ok(cstr) = CString::new(cmd) else { continue };       // skip interior-NUL
    unsafe {
        let slot = (f.cbuf_get_current_player)();             // CBUF_FIRST_PLAYER = 0 on client
        (f.cbuf_add_text)(slot, cstr.as_ptr(), 0);            // source = kCommandSrcCode = 0
        (f.cbuf_execute)();
    }
}
```

- Both enum args are `enum class : int` → pass as `i32`. `kCommandSrcCode = 0` is **unrestricted** — bypasses the `ClientCommand` whitelist (e.g. `fps_max` applies).
- Queue command strings from your HTTP/bg thread; `runframe` drains them. **Never call `Cbuf_*` off the game thread.**
- This runs from native code, not a script coroutine, so `disconnect`/`map` don't self-destruct the caller — no crash.
- `sv_cheats`-gated commands still need `sv_cheats 1`; this bypasses the *script* whitelist, not cheat flags.

## Calling Squirrel from Rust (native → Squirrel push)

When native code detects an event the script side cares about (a HUD readout, a sound, a
notification), **push it** — call a global Squirrel function directly. Do NOT make Squirrel run a
per-frame `WaitFrame` loop polling a plugin sqfunction; that's wasted work every frame for an event
that fires rarely. Verified with rrplug 4.3.0 (2026-06).

```rust
use rrplug::high::squirrel::call_sq_function;
use rrplug::mid::squirrel::{SQFUNCTIONS, SQVM_CLIENT}; // also SQVM_SERVER, SQVM_UI

// MUST run on the engine thread — runframe / a concommand / convar callback / an sqfunction.
fn push_event(t: EngineToken, gain: i32, frame: i32, flag: bool) {
    let Some(sqvm) = *SQVM_CLIENT.get(t).borrow() else { return };  // None between maps → no-op
    let Some(sqfns) = SQFUNCTIONS.client.get() else { return };     // client funcs serve CLIENT+UI
    // R = () discards the return; A is the arg tuple. Target must be `global function MyMod_OnEvent`.
    let _ = call_sq_function::<(), _>(sqvm, sqfns, "MyMod_OnEvent", (gain, frame, flag as i32));
}

fn runframe(&self, t: EngineToken) {
    if let Some(ev) = self.detected_event() {        // detect natively…
        push_event(t, ev.gain, ev.frame, ev.flag);   // …and call straight into the CLIENT VM
    }
}
```

- **`SQVM_{CLIENT,SERVER,UI}`** are `EngineGlobal<RefCell<Option<NonNull<HSquirrelVM>>>>` in
  `rrplug::mid::squirrel` — rrplug keeps them current. `.get(token)` needs an `EngineToken` (proof
  you're on the engine thread); `.borrow()` then copy the `Option` (`Option<NonNull<…>>` is `Copy`).
  `SQVM_CLIENT` is the **CLIENT** vm (gameplay), distinct from `SQVM_UI` (menus).
- **`SQFUNCTIONS.client` / `.server`** are `OnceCell<SquirrelFunctions>`; `.get()` → the vtable.
  `client` covers BOTH the CLIENT and UI vms.
- **Args:** the tuple impls `IntoSquirrelArgs` (each element `PushToSquirrelVm`: `i32`, `f32`, `bool`,
  `String`, `Vector3`, …). Use `::<(), _>` to set the return type to `()` and discard it. **A wrong
  return type can segfault** (the api trusts you) — use `()` unless you really read a value back.
- The callee is looked up **by name in the root table**, so it must be a `global function` in that
  vm. If it isn't compiled yet (e.g. between map load and script init) the call returns
  `Err(CallError::FunctionNotFound)` — guard/ignore, never `.unwrap()`.
- **Thread rule (same as Cbuf):** only from the engine thread. From a background thread, queue it
  instead: `engine_sync::async_execute(AsyncEngineMessage::run_squirrel_func("Fn",
  ScriptContext::CLIENT, args))` (needs the `engine_sync` feature) — it runs on the next runframe
  and checks the sqvm generation so a mid-call map change can't crash it.
- Squirrel→native is the mirror (a registered `#[sqfunction]`); use that for queries (script asks
  native), and this for events (native tells script). For a transient visual (a fading HUD popup),
  the pushed callback should spawn a **short-lived** `thread` that animates then exits — not a
  persistent loop.

## Building & Installation

```bash
# --target is required because .cargo/config.toml has no global [build] target
cargo build --release --target x86_64-pc-windows-gnu
# Output: target/x86_64-pc-windows-gnu/release/my_northstar_plugin.dll

# Copy into the ACTIVE profile's plugins/ dir. Default profile is R2Northstar;
# with -profile=R2Titanfall (e.g. a vanilla+ setup) it's R2Titanfall/plugins.
# When unsure, copy to both:
TF2=~/.local/share/Steam/steamapps/common/Titanfall2
cp target/x86_64-pc-windows-gnu/release/my_northstar_plugin.dll "$TF2/R2Northstar/plugins/"
cp target/x86_64-pc-windows-gnu/release/my_northstar_plugin.dll "$TF2/R2Titanfall/plugins/"
```

Confirm it loaded in the active profile's `logs/nslog*.txt` (`[PLUGINSYS] loaded plugin handle`). A second copy that fails to bind a port logs an error and is harmless. Plugins load at startup — `reload_mods`/hot-reload does not reload a running plugin; restart the game.

### NEVER overwrite the DLL while the game is running — it hard-crashes TF2

The game holds the plugin DLL **memory-mapped**. `cp`-ing a new DLL over it (or `ln -sfn` re-pointing it) corrupts the live mapping and **hard-crashes the game instantly** (no error dialog). This is easy to do accidentally during a build→deploy→test loop where each iteration needs a restart anyway.

Separate **build** (always safe) from **install** (only when the game is closed). Gate the copy on the process being dead:

```bash
if pgrep -f "NorthstarLauncher|Titanfall2(_trial)?\.exe" >/dev/null 2>&1; then
    echo "TF2 running — built DLL but NOT installing (would crash the game)"; exit 0
fi
# ...then cp the DLL + ln -sfn the mod symlink
```

Workflow while iterating: `cargo build` freely with the game up; only copy into `plugins/` after the user quits, then they relaunch. (The mod's Squirrel files are safe to edit live, but still need a CLIENT VM recompile — re-enter a map — to take effect.)

## Reading game memory (netvars / field scanning)

When you need a value that has no Squirrel API (a netvar, an engine-internal field, a glitch's state), you read it natively from the entity struct. Squirrel passes the entity to a `#[sqfunction]` (`Option<&mut CBaseEntity>`), which you reinterpret and read at an offset. Two hard-won gotchas and the method that actually finds the right offset:

**Gotcha 1 — rrplug's mapped struct field offsets are STALE for this TF2 build.** rrplug 4.3 ships `C_Player`/`CBaseEntity` bindings with field offsets, but they do NOT match the retail TF2 binaries (verified: `C_Player::m_flGravity` mapped at `0x378` reads a constant `0`). Do not trust `(*cp).m_field` for the real offset — treat the bindings as a struct *shape*, not as correct offsets, and find the offset empirically against the live game.

**Gotcha 2 — most floats that "correlate" with a state are orientation/transform data, not what you want.** A field that reads `1.0` in one state and `0.8` in another is very often a rotation-matrix entry (`cos`/`sin` of view/aim angle): it reads ~`1.0` when aligned and swings the full `-1..1` as the player looks around. Detectors built on these false-trigger on any camera movement and "settle" when the player stops turning. **A single correlated observation is not evidence.** (This exact trap shipped a broken detector once — the "gravity" offset was view orientation.)

**Method that works — state-tagged scan + reproducibility check:**
1. **Dump wide.** Log every 4-byte float across the struct (`[0, 0x2700)` covers the player) to a CSV from the plugin, ~3 Hz. Open the file lazily, write to cwd (the game root — readable on Linux via Proton's `Z:`→`/`), and log the resolved path once via `log::info!`.
2. **Tag each row with player state** the mod computes (`0` dead / `1` pilot / `2` titan, passed as an `f32` param — rrplug accepts `int`/`float`/`bool`/`string` params). This lets you compare *like states only* and discard transitions, deaths, and alt-tab idle gaps (when unfocused the client drops to ~1 frame / several seconds — those frozen rows otherwise look like signal).
3. **Diff offline:** keep columns that are *constant through normal movement* (jump/wallrun/look-around) AND *stable at a different value* in the target state. Movement-dependent fields self-eliminate because they vary across the movement you captured.
4. **Confirm by reproducibility — the decisive step.** Trigger the state a *second* time from a different position/facing. Fields that land on the **same** value both times are genuine state; fields that change with facing (e.g. a value near `0–360` or a `cos`-like `-1..1`) are orientation/position **snapshots captured at the trigger moment** — discard them. Only ship an offset confirmed across ≥2 independent activations.

Keep the discovered offsets in the *consuming project's* source (commented), not in this skill — they're build- and feature-specific. What generalises is the method above and the two gotchas.
