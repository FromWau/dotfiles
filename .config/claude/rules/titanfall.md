## Titanfall2 (TF2) - Northstar Modding

### Official Resources
- **Main Wiki**: https://docs.northstar.tf/Wiki/
- **Modding Docs**: https://docs.northstar.tf/Modding/guides/gettingstarted/
- **Squirrel Docs**: https://docs.northstar.tf/Modding/squirrel/
- **Template**: https://github.com/laundmo/northstar-mod-template
- **My Mods**: https://github.com/FromWau/CrouchKickFix

### Mod Directory Structure
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

### mod.json Structure - CRITICAL RULES

#### ⚠️ PATH SPECIFICATION
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
            "Path": "your_script.nut",  // ✅ CORRECT - just filename
            "RunOn": "CLIENT",           // or "SERVER", "UI", etc.
            "ClientCallback": {
                "Before": "InitFunctionName"  // or "After"
            }
        }
    ]
}
```

#### Common Path Mistakes
```json
// ❌ WRONG - Will fail to load!
"Path": "mod/scripts/vscripts/script.nut"
"Path": "vscripts/script.nut"
"Path": "mod/script.nut"

// ✅ CORRECT
"Path": "script.nut"
```

#### RunOn Expressions
Boolean expressions that control when/where scripts compile:

**VM Contexts:**
- `CLIENT` - Client-side code
- `SERVER` - Server-side code
- `UI` - UI/menu code

**Game Modes:**
- `SP` - Singleplayer
- `MP` - Multiplayer
- `LOBBY` - In lobby/menus
- `DEV` - Dev mode only

**Examples:**
```json
"RunOn": "CLIENT"                    // Client only
"RunOn": "CLIENT || SERVER"          // Both client and server
"RunOn": "CLIENT && MP"              // Client in multiplayer only
"RunOn": "( CLIENT || SERVER ) && MP" // Both, but only in MP
"RunOn": "CLIENT && !LOBBY"          // Client not in lobby
```

#### Callbacks - Before vs After

```json
"ClientCallback": {
    "Before": "FunctionName",  // Called BEFORE map spawn
    "After": "FunctionName"    // Called AFTER map spawn
}
```

**Use "Before" when:** registering callbacks/hooks, setting up data structures
**Use "After" when:** need player entity to exist, spawning threads that track player

### Squirrel Script Patterns

#### Basic Mod Init Pattern
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

#### ⚠️ CRITICAL: Squirrel Vector Syntax
**Vectors ALWAYS require 3 components!**

```squirrel
// ❌ WRONG
RuiSetFloat2( element, "msgPos", <0.7, 0.4> )

// ✅ CORRECT
RuiSetFloat2( element, "msgPos", <0.7, 0.4, 0> )
RuiSetFloat3( element, "msgColor", <1, 1, 1> )
```

#### ⚠️ CRITICAL: Squirrel Struct and Function Patterns

- Use `global struct` for structs shared across files
- Declare `global function` at file top for exported functions
- File struct can only contain simple types (`int`, `float`, `bool`, `string`, `vector`, `var`, `array`, `table`)
- ClientCallback/ServerCallback functions take NO parameters — get player with `GetLocalClientPlayer()`
- Use `while (true)` for persistent threads, not `while (IsValid(player))`
- Functions with return types need explicit final return outside conditionals
- Multiple try-catch blocks in same function must be wrapped in `{}` scope blocks
- **ALWAYS add `untyped` as the first line of every .nut file**

#### Threading Pattern
```squirrel
// ✅ CORRECT - Get fresh player each frame, survives map changes
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
        WaitFrame()  // CRITICAL - prevents freeze
    }
}
```

### Debugging & Testing

Logs: `~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs/`

```bash
# Validate mod.json syntax
jq . mods/FromWau.ModName/mod.json

# Check recent logs for errors
grep -i "error\|failed" ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs/nslog*.txt | tail -20
```

### Deployment
```bash
# Symlink for development
ln -s "$(pwd)/mods/FromWau.ModName" ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/mods/
```

### Author Convention
Always set author as **FromWau** in mod.json
