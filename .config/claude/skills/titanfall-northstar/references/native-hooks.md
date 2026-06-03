# Native engine hooks from an rrplug plugin (detouring `ClientSayText`)

When Northstar exposes **no Squirrel hook** for something, a native rrplug plugin can
**detour the engine function** directly. Worked example: send-side chat color — there
is no outgoing-chat Squirrel hook (only `OnReceivedSayTextMessage`, which is too late
+ per-viewer), so we hook the function every send funnels through. Project:
`~/Projects/NorthstarMods/FromWau.ChatColorTagsNative`.

## Finding a target function (the recon pattern)
1. `strings Northstar.dll | grep -i <feature>` — Northstar reimplements many things;
   look for symbol names. Chat turned up `ClientChatCommand` + `LocalChatWriter`.
2. Read the **open-source launcher**: `gh api repos/R2Northstar/NorthstarLauncher/...`.
   `primedev/client/chatcommand.cpp` revealed the actual send call:
   ```cpp
   // engine.dll + 0x54780
   void(__fastcall* ClientSayText)(void* a1, const char* message, uint64_t isIngameChat, bool isTeamChat);
   void ConCommand_say(const CCommand& args){ if(args.ArgC()>=2) ClientSayText(nullptr,args.ArgS(),true,false); }
   ```
   Every path (chat box, `say`, `say_team`, script `ClientCommand`) funnels through it.
3. **Verify the offset** with objdump before trusting it:
   ```bash
   IB=$(objdump -p engine.dll | awk '/ImageBase/{print $2}')
   objdump -d engine.dll --start-address=$((0x$IB+0x54780)) --stop-address=$((0x$IB+0x547e0)) -M intel
   ```
   Confirm a real prologue and that arg handling matches the signature. (`mov rsi,rdx`
   = save `message`; `cmp edi,1` = the `isIngameChat` check.) Engine.dll offsets are
   the fixed last-patch TF2 build → stable across Northstar versions.

## Static RE with pefile + capstone (xref a script function → its field offset)

`objdump` disassembles but can't xref. For "what offset does `player.IsWallRunning()` read?" or
"where's the bind table?", drive **pefile + capstone** (no game running, no debugger). Setup:
`uv run --with pefile --with capstone python script.py`, `pe = pefile.PE(dll); data =
pe.get_memory_mapped_image()` (RVA-indexed), `base = pe.OPTIONAL_HEADER.ImageBase` (0x180000000).

The repeatable chain (used to crack CrouchKickFix's wall-run + local-player + bind table):
1. **String → RVA:** `data.find(b"IsWallRunning\x00")`.
2. **Find code that refs it.** x64 loads strings via `lea reg,[rip+disp32]`, so scan `.text`
   for a disp32 `d` where `(rva_of_disp + 4) + d == string_rva`. That hit is inside the Squirrel
   **function-registration** block.
3. **Read the registration struct** around the hit: it `lea`s the name, the help string, and the
   **C++ function pointer** (`lea rax,[rip+x] ; mov [rcx+0x60],rax` — a `lea` whose target lands in
   `.text`). That target is the native impl of the script method.
4. **Disasm the impl** → the member read. `IsWallRunning` was literally
   `movss xmm0,[rip+k] ; comiss xmm0,[rcx+0x249C] ; seta al` → **wallrunning = `*(f32)(player+0x249C) < 1.0`**.
5. **Local-player pointer** came from `GetLocalClientPlayer`'s resolver (same string→reg→impl
   walk): the classic Source EHANDLE lookup — `handle=u32@client+0xC21658` (`0xFFFFFFFF`=none),
   `entlist=ptr@client+0xB0F030`, `entry = entlist + (idx<<5)` (0x20 stride), validate
   `*(u32)(entry+0x10)==serial`, player `= *(ptr)(entry+8)`.
6. **Data globals (no string xref):** find the ConCommand whose handler touches it. `unbindall` /
   `key_listboundkeys` handlers sit next to the **bind table** at `engine+0x1396C5C0` (array indexed
   by `ButtonCode_t`, **stride 0x10**, command-string ptr at +0).

Helpers: `from capstone.x86 import X86_OP_MEM, X86_REG_RIP`; rip target = `ins.address + ins.size +
op.mem.disp - base`. Map file-offset↔RVA via the section table if you grep raw bytes with `strings`/`grep -abo`.

## Verified TF2 offsets + the `tf2-input` crate (this retail build, 2026-06)

From the user's `bin/x64_retail/{client,engine}.dll` (TF2 is frozen, so these are stable):
- `client.dll` **velocity** globals: vx `+0xB34C2C`, vy `+0xB34C30`, vz `+0xB34C34` (f32; verified
  live: √(vx²+vy²) matched the in-game speed). **wall-run:** `*(f32)(localplayer+0x249C) < 1.0`.
- Local-player EHANDLE resolution: see step 5 above (`client+0xC21658`, `client+0xB0F030`).
- `engine.dll` **bind table** `+0x1396C5C0` (stride 0x10, cmd ptr @+0). Jump verb = `+ability 3`
  (MP) / `+jump`; crouch = `+duck`; toggle-crouch = `+toggle_duck` (authoritative list:
  `R2*/runtime/compiled/scripts/kb_act.lst` and `r2/cfg/config_default_pc.cfg`).
- ⚠️ **Don't trust borrowed offsets blindly:** FzzyMod's `client.dll+0x11EED78` ("onGround") read
  as a refcount/`inc-dec` in *this* build — older mods target a slightly different build. Re-derive
  + verify (the `VirtualQuery`-guarded dump below makes a wrong offset safe, not a crash).

**`tf2-input` crate** (reusable, in the CrouchKickFix repo) — query input **by action, not key**, so
any rebind (incl. mouse/scroll, multiple binds per action) works:
```rust
tf2_input::on_button_event(scan, pressed); // from the PostEvent/input hook, every press/release
tf2_input::refresh();                       // resolve binds from the engine table (once + periodically)
if tf2_input::is_down(Input::Jump) { … }     // any key bound to the action held?
tf2_input::matches(Input::Crouch, scan)      // is this ButtonCode bound to the action?
```
`Input` mirrors the keybind menu (`Jump, Crouch, ToggleCrouch, Fire, Aim, Reload, …`), each →
verb(s) from `kb_act.lst`. Internals: scan ButtonCode 0..256 of the bind table, strcmp the command
against each action's verbs (up to N keys per action); held-state = a `[bool;256]` keyed by
ButtonCode fed from the hook. **Every engine deref is `VirtualQuery`-guarded** (Rust port of
FzzyMod's `IsMemoryReadable`) so a wrong offset on a future build resolves nothing instead of
crashing. Windows-only (reads engine memory); not host-testable.

## RE sources (no full TF2 decompile exists — verified 2026-06)
Get NAMES / SIGNATURES / STRUCT layouts from these; get/verify the TF2 ADDRESS yourself.
- **NorthstarLauncher / `primedev`** (MIT, TF2-correct, maintained) — primary for confirmed
  TF2 engine functions (Cbuf, chat, hoststate, `r2engine.h`). Does NOT cover the input system.
- **r5sdk** (Mauler125) — deep RE of the *same Respawn Source fork* (Apex), incl. a full
  `CInputSystem`. Best dictionary for names/struct shapes/vtables, and it resolves everything
  by **AOB signature-scanning** (`FindPatternSIMD` + an `IDetour`/`GetFun` pattern). Addresses
  & struct sizes are **Apex-specific — re-derive for TF2**; treat names/shapes as hypotheses to
  confirm. License = Valve Source-SDK (non-commercial; fine for referencing names, license-aware
  if copying code).
- **FzzyMod** (Fzzy2j) — the real TF2 `inputsystem.dll` `CInputSystem::PostEvent` signature +
  `InputEventType_t` (offsets are stale/pinned). **TTF2SDK** (MIT) — `ButtonCode_t` enum +
  `IInputSystem` vtable. **T2H1** — TF2 netvar/vtable dictionary (2020, stale).
- **Source SDK 2013** (Valve) — upstream named types that survive the fork (`ButtonCode_t`,
  `CUserCmd`, `IVEngineClient`, `InputEventType_t`).

**Offset strategy:** hardcoded RVA + `objdump` prologue check (as above) is fine — TF2 is FROZEN
(no patches since ~2020), so RVAs are stable. For robustness/self-documentation, **AOB
signature-scanning** (r5sdk-style) is the higher-quality option if a port grows.

## Calling-convention note
On x86_64-windows, MSVC `__fastcall` == the default Win64 convention. In Rust that's
**`extern "C"`** (rcx, rdx, r8, r9) — NOT `extern "fastcall"` (x86-only).

## Hooking on stable Rust
rrplug 4.3 has `offset_functions!` (to *call*) but no detour API. Use the **`retour`**
crate — but its `static_detour!` macro needs **nightly** (`#![feature(...)]`). On stable,
disable default features and use **`GenericDetour`**:
```toml
retour = { version = "0.3", default-features = false }
```
```rust
type SayFn = unsafe extern "C" fn(*mut c_void, *const c_char, u64, bool);
offset_functions! { ENGINE_SAY + EngineSay for WhichDll::Engine => {
    client_say_text = unsafe extern "C" fn(*mut c_void,*const c_char,u64,bool) where offset(0x54780);
}}
static DETOUR: OnceLock<GenericDetour<SayFn>> = OnceLock::new();
static INSTALLED: AtomicBool = AtomicBool::new(false);

unsafe extern "C" fn say_detour(a1:*mut c_void, msg:*const c_char, ingame:u64, team:bool){
    let new = (!msg.is_null()).then(|| unsafe{CStr::from_ptr(msg)}.to_str().ok()).flatten()
        .and_then(colortags_core::expand_tags).and_then(|s| CString::new(s).ok());
    let Some(d)=DETOUR.get() else {return};
    unsafe { match &new { Some(c)=>d.call(a1,c.as_ptr(),ingame,team), None=>d.call(a1,msg,ingame,team) } }
}

// in Plugin::on_dll_load (fires per dll; try_init no-ops for non-engine):
unsafe { EngineSay::try_init(dll_ptr,&ENGINE_SAY) };
if let Some(f)=ENGINE_SAY.get() {
    if !INSTALLED.swap(true,Ordering::SeqCst) {
        let d = unsafe{ GenericDetour::<SayFn>::new(f.client_say_text, say_detour) }.unwrap();
        DETOUR.set(d).ok();                       // store BEFORE enable (detour calls .get())
        unsafe { DETOUR.get().unwrap().enable() }.unwrap();
    }
}
```
Key points: install once (AtomicBool), store in the `OnceLock` **before** `enable()`,
call the original via `d.call(...)` (the trampoline), keep the rewritten `CString`
alive across the call. The engine formats `message` into a **256-byte** buffer, so very
long messages truncate.

## Safety / packaging
- The detour runs on the **game thread** (called from the command path) — safe to do
  engine-adjacent work; no extra threads.
- Ship it as its **own plugin DLL** (not folded into another plugin) so a bad hook can
  be removed by deleting one file. Deploy as a package:
  `packages/<Author-Mod-Version>/plugins/<name>.dll` (+ `manifest.json`). Plugins load
  at startup — **rebuilt DLL needs a full restart** (no hot-reload). Confirm in nslog:
  `[<LOGTAG>] ... detour installed`.

## Chat color format (what the plugin emits) — FOREGROUND ONLY
Translates to ANSI, matching a default-themed Server Utilities server (`FSU_FormatString`):
- FSU tokens: `%F`header `%H`highlight `%T`text `%A`admin `%O`owner `%E`error
  `%S`success `%N`announce `%0`reset.
- Named: `%red %green %yellow %blue %magenta %cyan %white %black` + bright `%b*` + `%reset`.
- `#rrggbb` 24-bit hex, **each channel capped at 245** (255 → white).

### ⚠️ Foreground only — background/attributes CRASH the game
Verified the hard way: the TF2 chat RUI safely renders **foreground** SGR only
(`30-37`, `90-97`, `38;5;X`, `38;2;r;g;b`). **Background** (`40-47`/`100-107`/`48;…`)
and **attribute** (`1` bold, `2` dim, `3` italic, `4` underline, `5` blink, `7` reverse,
`9` strikethrough) codes do **not** render **and hard-crash/freeze the game**. Never
emit them. (UTF-8 is pipe-clean but the font only has ASCII + Latin-1 glyphs.)
