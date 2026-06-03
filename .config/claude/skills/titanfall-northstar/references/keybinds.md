# Keybinds, input commands & cfg (TF2/Northstar)

## Add actions to the in-game keybinds menu (`kb_act.lst`)
A mod ships a `kb_act.lst` and Northstar appends its entries to the keybinds menu
(verified: VanillaPlus ships one; the stock list is embedded in Northstar.dll). Format
is two tab/space-separated columns — `"<command>"  "<Menu Label>"` — and binding a key
to an entry binds the key to that command. `"blank"` makes a header/separator row:
```
"blank"            "===== KEYBIND SWITCHER ====="
"kbsw_speedrun"    "Layout: Speedrun"
"toggleconsole"    "Toggle Developer Console"
```
Ship it at the mod root: `mods/<Author.Mod>/kb_act.lst`. The command must be something the
console can run — a built-in, or a ConCommand your mod registers, or an alias. So custom
menu-bindable actions = `kb_act.lst` entry + a registered command of that name.

## Input verbs (the bindable `+`/`-` commands)
From the live command enumeration (see `references/devbridge.md` for the `help`-oracle
technique). Bind these to keys / fire via `exec`:
- Movement: `+forward -forward`, `+back`, `+moveleft`, `+moveright`, `+left`/`+right` (turn)
- **Jump = `+ability 3`** in MP — **NOT `+jump`** (`+jump` is registered but does not jump
  in multiplayer). Crouch (hold) = `+duck`; `+toggle_duck`.
- Combat: `+attack` (fire), `+zoom` (ADS) / `+toggle_zoom`, `+reload`, `+melee`, `+use`,
  `+offhand0..4` (ordnance/tacticals), `+weapon_discard`, `+speed`, `+walk`, `+dodge`.
- `getpos`/`getposvec` print player position to console (no CHEAT flag) — usable for telemetry.

## Spaced-command alias trick
A command with arguments (e.g. `+ability 3`) can't be nested inside a quoted alias/bind
value. Wrap it in a single-token `+`/`-` alias pair and bind that:
```
alias +srun_jump "+ability 3"
alias -srun_jump "-ability 3"
bind mouse2 +srun_jump      // press -> +ability 3, release -> -ability 3
```

## Double-tap an input (e.g. satchel detonate)
Pressing reload twice re-detonates a thrown satchel after you've swapped off the
detonator. From a cfg/alias use `wait` between presses; from a mod, issue
`+reload;-reload` twice across frames (the engine needs a frame between presses).

## cfg gotchas (`r2/cfg/custom.cfg`)
- **ASCII only.** A non-ASCII char (e.g. an em dash `—`) in a comment breaks the parser —
  it then executes the rest of the line as commands. Keep cfg pure ASCII.
- **Letter-key binds are lowercase:** `bind "i" ...`, not `"I"`.
- **cfg edits don't auto-apply to a running game** — re-`exec custom.cfg` (the DevBridge
  `exec` does this live), or restart. Note: a launch-option `+exec custom.cfg` is often
  **dropped** by the EA-app arg truncation — put it in `ns_startup_args.txt` instead
  (see `references/launch-args.md`).
- **Toggles/cyclers** use the self-rewriting alias-swap idiom (Source cfg has no
  functions/if): each state's alias rebinds keys, sets state, and rewrites the cycle alias
  to point at the next state, e.g.
  `alias kb_a "...; alias cycle kb_b"` / `alias kb_b "...; alias cycle kb_a"` / `bind i cycle`.

## Rebinding from script
To `bind`/rebind from the CLIENT VM, use the player method
`GetLocalClientPlayer().ClientCommand("bind <key> <action>")` (the bare global `ClientCommand`
is UI-VM only). It's whitelist-gated; `say` works this way, `bind` is expected to (verify per
build). This is how a layout-switcher mod applies a bind-set without touching cfg.
