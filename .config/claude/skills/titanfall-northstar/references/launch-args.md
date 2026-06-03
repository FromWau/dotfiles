# Launch args are truncated by the EA-app handoff → use `ns_startup_args.txt`

## Symptom
Console-command launch options (`+exec custom.cfg`, `+cl_showfps 2`, `+fps_max 121`)
and trailing `-flags` (e.g. `-height`) **don't apply on launch**, even though they're
in the Steam launch options:
- FPS counter off despite `+cl_showfps 2`
- `custom.cfg` never runs → keybinds/aliases missing (`Unknown command: <alias>` when
  a bound key fires)
- frame cap / resolution not applied

It looks like "`+` commands do nothing on Linux", but that's not the real cause.

## Cause: the EA-app `link2ea` handoff truncates the argument string
On this setup Steam launches through the EA app:
`Steam → link2ea://launchgame/1237970 → EA Desktop → EASteamProxy.exe → Titanfall2.exe`.
That handoff **cuts the argument string partway** (observed cut point: right after
`-width 2560`). Early `-flags` survive; everything after the cut — including all the
trailing `+commands` — is silently dropped.

## Diagnostic: see the args the game ACTUALLY received
```bash
PID=$(pgrep -f 'Titanfall2.exe -northstar' | head -1)
tr '\0' ' ' < /proc/$PID/cmdline; echo          # untruncated, real cmdline
# also the relay (shows the cut already present upstream):
tr '\0' ' ' < /proc/$(pgrep -f EASteamProxy | head -1)/cmdline; echo
# and confirm a convar didn't take:
curl -s -X POST http://127.0.0.1:8723/cmd -d '{"op":"get","cvar":"cl_showfps"}' >/dev/null
curl -s http://127.0.0.1:8723/state | jq '.convars.cl_showfps'   # "0" = +cl_showfps 2 never arrived
```
If the real cmdline ends early (no `+` commands), it's this truncation — NOT a mod.

## Fix: `ns_startup_args.txt` (bypasses the truncation)
Northstar hooks `GetCommandLineA` (`primedev/core/hooks.cpp`) and **appends the raw
contents of `ns_startup_args.txt` to the command line *inside the process*** — i.e.
after the EA handoff — so anything in that file reaches the engine intact, including
`+` commands. (`-dedicated` uses `ns_startup_args_dedi.txt`; `-nostartupargs` disables it.)

Create `<Titanfall2 root>/ns_startup_args.txt` (next to `Titanfall2.exe`), **one line**:
```
-vanilla -profile=R2Titanfall -multiple -novid -fullscreen -width 2560 -height 1440 +exec custom.cfg +cl_showfps 2 +fps_max 121
```
Rules:
- **Do NOT put `-northstar` in it** — it pops a warning box and must stay in the Steam
  launch options (you launch NorthstarLauncher via `-northstar`, not the file).
- Keep it a single line (the whole file is appended verbatim; stray newlines land on
  the cmdline).
- Steam launch options can then shrink to just the wrapper + `-northstar`
  (`LFX=1 gamemoderun %command% -northstar -profile=R2Titanfall`); duplicates between
  the two are harmless (the engine takes the first occurrence).

Takes effect next launch. To apply the same convars to an already-running game without
a restart, push them live via the DevBridge: `exec cl_showfps 2; fps_max 121`,
`exec custom.cfg` (see `references/devbridge.md`).

Related: a stripped/short launch (e.g. after boot-hang recovery, see
`references/boot-hang.md`) has the same effect — `custom.cfg` not run, binds dead.
`ns_startup_args.txt` makes the config independent of whatever survives the handoff.
