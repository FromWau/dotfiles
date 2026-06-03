# FromWau.DevBridge — usage reference

A local HTTP bridge that lets the Linux host (curl / a script / an agent) drive a
running Titanfall 2 + Northstar **client**. Project lives at
`~/Projects/NorthstarMods/FromWau.DevBridge` (rrplug Rust plugin + a thin Squirrel
companion mod). Designed to NOT depend on `sv_cheats` — works on public/vanilla
servers (this is the "vanilla+" setup, profile `R2Titanfall`).

## Endpoint

Binds **`127.0.0.1:8723`** (loopback only, no auth, single user).

| Method | Path | Returns |
|--------|------|---------|
| `GET`  | `/health` | `{"ok":true,"phase":N}` |
| `GET`  | `/state`  | latest snapshot: `{"age_ms":N,"alive":bool,"connected":bool,"convars":{..},"stale":bool}` |
| `POST` | `/cmd`    | enqueue a command → `{"queued":true,"id":N}` |

## Commands (`POST /cmd`) — three ops, TWO transports

```json
{"op":"get","cvar":"sv_cheats"}
{"op":"set","cvar":"cl_fovScale","val":"1.2"}
{"op":"exec","cmd":"say hello"}
```

**This split is the single most important thing to know:**

- **`exec` → native `Cbuf_AddText` on the game thread.** Works **regardless of VM
  state** — in menus, between maps, anywhere. This is the workhorse. `;` and `|`
  are fine (sent verbatim to the command buffer); only `\n`/`\r`/`\0` are rejected.
- **`get`/`set` → the Squirrel companion wire** (`id|op|cvar|val` lines drained by
  the companion each frame). They **only take effect in a live CLIENT VM (in a
  match)**. In a menu/lobby they queue but nothing drains. The result of a `get`
  (and the read-back of a `set`) lands in the next `/state` under `convars`.
  An unknown/throwing cvar is marked `"<invalid>"` there rather than crashing.

`/cmd` returns immediately with a queued `id`; it does NOT return the value. Read
`/state` to get `get`/`set` results. Malformed args (empty cvar, wire delimiters in
cvar/val, empty/NUL cmd) → HTTP 400, not a silent mis-parse.

## curl quickstart

```bash
B=http://127.0.0.1:8723
curl -s $B/health
curl -s $B/state | jq .
curl -s -X POST $B/cmd -d '{"op":"exec","cmd":"say hi"}'
curl -s -X POST $B/cmd -d '{"op":"get","cvar":"cl_fovScale"}'   # then read /state
```

Always resolve the **active log** dynamically (it rotates per launch):
```bash
LOG=$(ls -t ~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs/nslog*.txt | head -1)
```

## High-leverage techniques that ride on `exec`

These turn the bridge into far more than a cvar poker. All confirmed on this build
(vanilla+, no `sv_cheats`):

- **`script_client <code>` = arbitrary client Squirrel.** Not cheat-flagged; runs in
  the live CLIENT VM. e.g. `exec script_client print(GetLocalClientPlayer().GetOrigin())`.
  `script` (server) IS cheat-gated. Console output → nslog as `[SCRIPT CL] [info]`.
  - Inject control bytes past the console tokenizer with `format("%c", N)` in-VM
    (e.g. ESC = `format("%c",27)`), since the console may strip raw control chars.
- **`help <name>` = safe enumeration oracle.** This engine strips
  `cvarlist`/`cmdlist`/`find`/`differences`. `help` *describes* any cvar/command
  (value, flags, desc) **without executing it**, and prints `unknown command <x>`
  otherwise. Batch hundreds per `exec` with `;` and read the nslog. NOTE: `help`
  only knows **console** cvars/commands — NOT Squirrel functions (use
  `script_client printt("X" in getroottable())` for those, in a live match).
- **Reading output:** there is no return channel for `exec`; capture results by
  diffing the nslog (mark line count before, slice after). Console + chat + script
  prints all mirror to nslog.
- **Chat:** read via the nslog (each received message is a multi-line block:
  blank / `[tag] name` / `:` / blank / `message`), or far more cleanly via the
  `FromWau.ChatEvents` mod which emits one `CHATEV|seq|scope|dead|name|text` line
  per message. Send via `exec say <msg>` / `say_team`. ANSI color codes work
  (`\x1b[31m`); see the chat capabilities note in SKILL.md.

## Live dev loop (no relaunch)

- `exec custom.cfg` re-applies cfg edits to the running game (cfg edits do NOT
  auto-apply; re-exec or restart).
- `set` a ConVar to change it live (in a match).
- `exec script_client ...` to test client script behavior instantly.
- Restarts are only needed for: a NEW mod, keyvalues changes (compile at startup),
  or a rebuilt plugin DLL.

## Build & deploy

```bash
cd ~/Projects/NorthstarMods/FromWau.DevBridge && ./deploy.sh
```
Builds `devbridge_plugin.dll` (cross to `x86_64-pc-windows-gnu`), copies it to
`<profile>/plugins/`, and symlinks the companion `mod` into `<profile>/mods/` for
both `R2Titanfall` and `R2Northstar`. A **rebuilt plugin needs a full restart**
(plugins don't hot-reload). The companion mod follows normal mod reload rules
(re-enter a map for script changes). Confirm load in nslog:
`[PLUGINSYS] loaded plugin handle` and `'FromWau.DevBridge' loaded successfully`.

## Gotchas

- `get`/`set` silently do nothing outside a live match — if `/state` looks stale or
  `convars` aren't updating, you're probably in a menu. `exec` still works there.
- The companion accumulates every `get`/`set` cvar into a watched set refreshed each
  frame; it never clears within a session (harmless — small).
- Cheat/server-owned cvars won't change on a public server; the `/state` read-back
  makes that visible instead of erroring.
- See `~/Projects/NorthstarMods/FromWau.DevBridge/design.md` for architecture and
  `crates/devbridge-core` (host-testable: `cargo test`, no rrplug dep) for the
  Command enum + validation + HTTP routing.
