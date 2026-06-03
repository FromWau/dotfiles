# TF2 + Northstar (Proton) won't launch — EA-app boot-hang

Setup: Arch Linux, latest GE-Proton (`proton-ge-custom-bin`), Steam appid
**1237970**, active profile **R2Titanfall**. Steam launches the game through the
EA app via a `link2ea://launchgame/1237970` handshake. When that handshake stalls,
the game never reaches the Titanfall home screen.

## First: confirm it's THIS, not a mod/plugin
A mod/script/plugin fault would let the game launch, log startup, then error **in a
fresh nslog**. The boot-hang produces **no fresh nslog at all** — Northstar never
initializes. Check:

```bash
TF2=~/.local/share/Steam/steamapps/common/Titanfall2
ls -t "$TF2/R2Titanfall/logs/nslog"*.txt | head -1     # newest still from a prior session?
ps -eo pid,etime,comm,args | grep -iE 'EADesktop|EABackground|Titanfall2\.exe|NorthstarLauncher|wineserver|gameoverlayui.*1237970' | grep -iv grep
```
If the newest nslog is stale → it's the EA handshake, **not your mod**. (Don't waste
time disabling mods.)

## Healthy boot sequence (diagnose deviations against this)
A good launch walks this process chain over ~20s:
```
wineserver
 → EABackgroundService.exe
 → EA Desktop CEF  (CrBrowserMain / CrGpuMain / CrRendererMain / CrUtilityMain)
 → EADesktop.exe + EASteamProxy.exe        (EASteamProxy relays the launch args)
 → Titanfall2.exe -northstar -vanilla -profile=R2Titanfall ...
 → fresh R2Titanfall/logs/nslog<timestamp>.txt   (Northstar init = success)
```
A hang that never reaches `EADesktop.exe` / `Titanfall2.exe` / a fresh nslog is
stuck in the handshake → walk the ladder below.

Watch a launch live:
```bash
LOGDIR=~/.local/share/Steam/steamapps/common/Titanfall2/R2Titanfall/logs
base=$(ls -t "$LOGDIR"/nslog*.txt | head -1)
for i in $(seq 1 35); do
  p=$(ps -eo comm | grep -iE 'EADesktop|EABackground|Titanfall2\.exe|NorthstarLauncher|wineserver' | sort -u | tr '\n' ',')
  n=$(ls -t "$LOGDIR"/nslog*.txt | head -1); [ "$n" != "$base" ] && n="FRESH:$(basename "$n")" || n=""
  echo "$(date +%T) [$p] $n"; sleep 2
done
```

## Fix ladder — LEAST destructive first
Try one rung, then relaunch, so you learn the real fix. (The old memory note jumped
straight to rung 4; rung 1 was enough in practice — 2026-06.)

### Rung 1 — clear stale launch state, relaunch  ← worked 2026-06
Failed attempts leave **orphaned `gameoverlayui` processes** (their target game pid
dead) and can leave a stale `wineserver`/EA proc, confusing Steam's launch
bookkeeping. Kill them, then relaunch normally.
```bash
# orphaned overlays for this game:
pkill -9 -f 'gameoverlayui.*-gameid 1237970'
# any stale EA/game exe:
pkill -9 -f 'EADesktop.exe|EABackgroundService.exe|Titanfall2.exe|NorthstarLauncher.exe'
# stale prefix wineserver, if present:
WINEPREFIX=~/.local/share/Steam/steamapps/compatdata/1237970/pfx wineserver -k 2>/dev/null || true
```
To check whether a `gameoverlayui ... -gameid 1237970` is orphaned: its `-pid <N>`
arg points at the game process — if that pid is dead, the overlay is stale.

### Rung 2 — launch with NO args, let EA app fully come up
Steam → remove ALL launch options → Launch → log into EA Desktop, wait until fully
loaded → press **Stop** in Steam → relaunch. Non-destructive; re-add args after.

### Rung 3 — clear EA Desktop caches (surgical, auto-regenerated)
```bash
AD=~/.local/share/Steam/steamapps/compatdata/1237970/pfx/drive_c/users/steamuser/AppData
rm -rf "$AD/Local/EADesktop/cache" \
       "$AD/Local/Electronic Arts/EA Desktop/OfflineCache" \
       "$AD/Local/Electronic Arts/EA Desktop/IGOCache"
```

### Rung 4 — NUCLEAR: delete the whole Proton prefix (last resort)
Loses EA install + all wine config; requires EA re-login + re-setup.
```bash
rm -rf ~/.local/share/Steam/steamapps/compatdata/1237970
```
Then: remove launch args → launch → log into EA, wait → Stop → launch again (should
reach home) → exit → re-add launch args.

## Launching from the CLI (instead of clicking Play)
`/usr/bin/steam` can drive it: `steam steam://rungameid/1237970` (respects the
configured launch options). Steam has **no clean CLI status query** — there's no live
`RunningAppID` in `~/.steam/registry.vdf`; use `ps` for "is it running".

## Launch args (vanilla+; `-vanilla` does NOT disable Northstar)
```
LFX=1 gamemoderun %command% -northstar -vanilla -profile=R2Titanfall -multiple -novid -fullscreen -width 2560 -height 1440 +exec custom.cfg +cl_showfps 2 +fps_max 121
```
`-vanilla` = Northstar's vanilla+ mode (loaded, can play vanilla servers). Profile
`R2Titanfall` → Northstar reads mods/plugins from and logs to `R2Titanfall/`.
See also the `tf2-ea-app-boot-fix` memory note and `references/devbridge.md`.
