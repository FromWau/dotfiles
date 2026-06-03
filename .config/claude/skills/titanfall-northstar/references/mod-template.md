# Northstar mod template & naming conventions

Canonical structure, naming, and the dev workflow used in `~/Projects/NorthstarMods`.
See SKILL.md for the hard rules (Path field, RunOn, callbacks, Squirrel gotchas);
this file is the copy-paste starting point.

## Naming convention

- **Mod `Name` / folder:** `Author.PascalCaseModName` — e.g. `FromWau.KeybindHud`,
  `FromWau.ChatEvents`, `FromWau.HipfireCrosshairs`. Author first, dot, then the
  mod name in PascalCase (no spaces).
- **Author:** always `FromWau` (in `mod.json` `Authors`).
- **ALWAYS: folder = symlink = `mod.json` `Name` = `Author.PascalCaseModName`** (e.g.
  `FromWau.KeybindHud`). The in-game mod list shows the `mod.json` `Name`, so keeping every
  mod's `Name` as `FromWau.*` (matching its folder) lets you find/filter all your mods by
  author. `enabledmods.json` keys off `Name`. (Technically Northstar keys off `Name` not the
  folder, so they *can* differ — e.g. older `MatchReadyAudio` shipped `"Name": "Match Ready
  Audio"` — but that breaks the `FromWau.*` grouping, so **fix any such mismatch**.) This is
  distinct from the Thunderstore `manifest.json` `name` (bare PascalCase, no dots — see below).
- Script files: lowercase `snake_case.nut` (e.g. `keybind_hud.nut`).
- Init/callback functions: `ModName_Init`, `ModName_OnClientInit`, etc.

## Directory layout

**Standard (script/keyvalues-only mod)** — project root IS the mod root:
```
FromWau.MyMod/                     <- symlink target = this dir
├── mod.json
└── mod/scripts/vscripts/my_mod.nut
   (optional siblings: keyvalues/, resource/, materials/, sound/)
```
Symlink: `ln -sfn <repo>/FromWau.MyMod  <profile>/mods/FromWau.MyMod`

**Combined Rust-plugin + mod project** (like `FromWau.DevBridge`) — the Northstar
mod is wrapped in a `mod/` subdir so the repo root can hold `Cargo.toml`, `crates/`,
etc.:
```
FromWau.DevBridge/
├── Cargo.toml  crates/  deploy.sh
└── mod/                            <- symlink target = this subdir
    ├── mod.json
    └── mod/scripts/vscripts/companion.nut
```
Symlink: `ln -sfn <repo>/FromWau.DevBridge/mod  <profile>/mods/FromWau.DevBridge`

Either way, what Northstar must see is `<modroot>/mod.json` and
`<modroot>/mod/scripts/vscripts/<file>.nut`.

## Install location: `packages/` is the default; `mods/` is classic

Northstar scans **two** mod roots (verified in `modmanager.cpp` / `pluginmanager.cpp`):

- **`<profile>/packages/`** — the modern Thunderstore layout. **Default for new
  work** — it's the only one that can bundle a **native plugin**, carries package
  metadata (`manifest.json`), and matches how the Thunderstore mod manager installs.
- **`<profile>/mods/`** — the "classic" dir (called `classicModsDir` in source).
  NOT deprecated and still fully loaded, fine for manual/dev mods — but it does
  **not** scan per-mod `plugins/`, so it can't carry a plugin.

### Package structure
```
packages/<Author-Mod-Version>/
├── manifest.json                 # { name, version_number, website_url, description, dependencies:[] }
├── mods/
│   └── Author.ModName/           # the actual mod (mod.json + mod/scripts/...) — keeps the DOTTED name
│       └── mod.json
└── plugins/
    ├── my_plugin.dll             # native rrplug plugins go here (scanned per-package)
    └── lib/                       # optional shared libs
```
A package may have only `mods/`, only `plugins/`, or both. `manifest.json` mirrors
Thunderstore's (see `packages/NachosChipeados-VanillaPlus-2.5.1/` as a live template).

### CRITICAL: the package DIRECTORY name must match `AUTHOR-MOD-VERSION`
Regex Northstar enforces:
```
[a-zA-Z0-9_]+-[a-zA-Z0-9_]+-\d+\.\d+\.\d+
```
i.e. **`Author-Mod-Version`**, three hyphen-separated parts:
- AUTHOR and MOD: `[a-zA-Z0-9_]+` only — **NO dots, NO hyphens** (use `_` if needed).
- VERSION: strict semver **`X.Y.Z`** (three numeric parts; pad `1.0` → `1.0.0`).

A dir that doesn't match (e.g. `FromWau.MyMod`, or a 2-part version) is **silently
skipped** with `warning: did not match 'AUTHOR-MOD-VERSION'` and the mod never loads.
Note the **inner** mod folder still uses the dotted `Author.ModName` convention — only
the **outer package dir** is `Author-Mod-Version`. Example:
`packages/FromWau-KeybindHud-1.0.0/mods/FromWau.KeybindHud/mod.json`.

For a plugin-only package (no Squirrel): `packages/FromWau-MyPlugin-1.0.0/plugins/my_plugin.dll`
(+ `manifest.json`). Deploy by copying the built DLL there (see `references/devbridge.md`
for the rrplug build/cross-compile flow); a rebuilt plugin needs a full restart.

## mod.json template

```json
{
    "Name": "FromWau.MyMod",
    "Description": "One line: what it does and that it's client-side.",
    "Version": "1.0.0",
    "LoadPriority": 1,
    "Authors": ["FromWau"],
    "ConVars": [
        { "Name": "mymod_enabled", "DefaultValue": "1" }
    ],
    "Scripts": [
        {
            "Path": "my_mod.nut",
            "RunOn": "CLIENT",
            "ClientCallback": { "Before": "MyMod_Init" }
        }
    ]
}
```

- **`Path`** is the BARE filename — never `mod/scripts/vscripts/...` (see SKILL.md).
- **`RunOn`** boolean expr: `CLIENT` / `SERVER` / `UI`, combinable with
  `MP`/`SP`/`LOBBY` (`"CLIENT && MP"`, `"CLIENT && !LOBBY"`).
- **Callback key matches the VM:** `ClientCallback` / `ServerCallback` / `UICallback`,
  with `Before` (pre map spawn — register hooks/data) or `After` (player entity
  exists). The function takes no params; get the player via `GetLocalClientPlayer()`.
- **`ConVars`** array registers cvars at load (`{Name, DefaultValue}`); read/write
  them from script or live via the DevBridge.
- **`LoadPriority`** higher = loads later (overrides earlier). Default 1. Bump it
  when your callback should run after another mod's (callback chain = load order).

## Minimal script (`my_mod.nut`)

```squirrel
untyped                                  // ALWAYS the first line

global function MyMod_Init

struct { int n = 0 } file                // file-scope state; simple types/arrays only

void function MyMod_Init()
{
    AddCallback_OnClientScriptInit( MyMod_OnInit )   // or register your hook here
}

void function MyMod_OnInit( entity player )
{
    thread MyMod_Loop()
}

void function MyMod_Loop()
{
    while ( true )
    {
        WaitFrame()                      // CRITICAL — never a tight loop
        entity p = GetLocalClientPlayer()
        if ( !IsValid( p ) || !IsAlive( p ) )
            continue
        // per-frame work...
    }
}
```

## Dev workflow

1. Build/edit under `~/Projects/NorthstarMods/FromWau.MyMod`.
2. Symlink into the active profile (active profile is `R2Titanfall` in this
   vanilla+ setup). **Default to `packages/`** (needed if it ships a plugin):
   ```
   TF2=~/.local/share/Steam/steamapps/common/Titanfall2
   PKG="$TF2/R2Titanfall/packages/FromWau-MyMod-1.0.0"
   mkdir -p "$PKG/mods" && cp <repo>/manifest.json "$PKG/"
   ln -sfn <repo>/FromWau.MyMod "$PKG/mods/FromWau.MyMod"
   ```
   Quick script/keyvalues-only dev mods can still go straight in `mods/`:
   `ln -sfn <repo>/FromWau.MyMod "$TF2/R2Titanfall/mods/FromWau.MyMod"` (no plugin support).
3. Validate JSON: `jq . mod.json` (and the package's `manifest.json`).
4. Load it.

**What needs what:**
| change | how to apply |
|--------|--------------|
| new mod added | **full restart** (`reload_mods` won't load a new mod or recompile the running VM) |
| `.nut` script edit | re-enter a map (new CLIENT VM) |
| `keyvalues/` change | **full restart** (compiled at startup) |
| ConVar value | live (`SetConVar*` in script, or DevBridge `set`/`exec`) |
| `custom.cfg` edit | `exec custom.cfg` (DevBridge) or restart |
| rebuilt Rust plugin | **full restart** |

Verify load in nslog:
```bash
LOG=$(ls -t ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs/nslog*.txt | head -1)
grep -aiE "FromWau.MyMod|error|failed" "$LOG" | tail
```
Expect `'FromWau.MyMod' loaded successfully, version X`.
