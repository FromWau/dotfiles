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
straight to rung 4. Rung 1 was enough on 2026-06, but on 2026-06-12 it failed three
clean attempts in a row and only the rung 2 launch-without-Northstar fixed it. On
2026-06-13 it was worse still — the "EA Desktop UI wedge" variant (below) survived
rungs 1-3 + a CEF reset and only rung 4 fixed it. Don't over-trust rung 1; if it
re-hangs identically twice, skip ahead. On 2026-06-21 a clean rung-1-state attempt
failed identically — `EADesktop.exe` NEVER spawned (only `EABackgroundService` + a
`CrBrowserMain` CEF proc, collapsing after ~60s, no fresh nslog) — and **rung 3
(clear EA caches) fixed it on the first relaunch**; leaving `CEF` intact avoided an
EA re-login.)

**⚠️ Never fix this by switching Proton version.** Proton Experimental shipped an
April-2026 Xalia 0.4.9 fix for the EA-app lockup, BUT **Northstar requires GE-Proton**
— forcing the game onto Experimental/stock Proton to dodge the lockup breaks Northstar.
Keep GE-Proton selected and fix at the prefix/cache layer. (User confirmed 2026-06-13.)

### "EA Desktop UI wedge" symptom (2026-06-13)
A nastier shape than a pure handshake stall: `EADesktop.exe` + CEF
(`CrBrowserMain`/`CrGpuMain`/`CrUtilityMain`) spawn and persist, but **no EA window
ever renders** and **no fresh EA app log** is written (only stale ones in
`.../EA Desktop/Logs/`), so it never hands off to `Titanfall2.exe`. Confirm via the
process watch (CEF up, no `Titanfall2.exe`, no fresh nslog for 60s+) + the user
reporting no window. This needed rung 4.

### Rung 1 — clear stale launch state, relaunch  ← worked 2026-06
Failed attempts leave **orphaned `gameoverlayui` processes** (their target game pid
dead) and can leave a stale `wineserver`/EA proc, confusing Steam's launch
bookkeeping. Kill them, then relaunch normally.
```bash
# orphaned overlays for this game:
pkill -9 -f 'gameoverlayui.*-gameid 1237970'
# any stale EA/game exe:
pkill -9 -f 'EADesktop.exe|EABackgroundService.exe|Titanfall2.exe|NorthstarLauncher.exe'
# stale prefix wineserver, if present. MUST use Proton's OWN wineserver binary:
# bare `wineserver` is absent/wrong on this host and silently no-ops, leaving the
# whole EA tree (steam.exe/EADesktop/EABackgroundService) alive (verified 2026-06-12).
# Glob the active GE-Proton build so this survives version bumps:
PFX=~/.local/share/Steam/steamapps/compatdata/1237970/pfx
WS=$(ls -t ~/.local/share/Steam/compatibilitytools.d/GE-Proton*/files/bin/wineserver 2>/dev/null | head -1)
WINEPREFIX="$PFX" "$WS" -k 2>/dev/null || true
```
To check whether a `gameoverlayui ... -gameid 1237970` is orphaned: its `-pid <N>`
arg points at the game process — if that pid is dead, the overlay is stale.

### Rung 2 — launch WITHOUT Northstar once, then re-add  ← worked 2026-06-12
The boot-hang is the EA handshake, and one full successful *vanilla* launch primes it.
Steam → Properties → Launch Options → remove the Northstar args (`-northstar -vanilla
-profile=R2Titanfall`), leaving e.g. just `LFX=1 gamemoderun %command%` (or clear the
box entirely) → **Play**. Without `-northstar` the game boots **vanilla TF2 all the way
into the main menu**, past the handshake that was hanging. Then **exit normally from
inside the game**, **add the Northstar args back**, and Play → now loads with Northstar.
Non-destructive. (Lighter variant if even vanilla hangs at the EA app: clear ALL
options → Launch → let EA Desktop fully load and log in → Stop → relaunch.)

### Rung 3 — clear EA Desktop caches (surgical, auto-regenerated)
**Best fit when `EADesktop.exe` NEVER spawns** (only `EABackgroundService` + a
`CrBrowserMain` CEF proc come up, then the whole tree self-collapses after ~60s with no
fresh nslog) — distinct from the UI-wedge variant where `EADesktop.exe` *does* persist.
Fixed it first-try on 2026-06-21. Deleting only the three caches below (NOT the sibling
`CEF` dir) preserves the EA login, so no re-login is needed.
```bash
AD=~/.local/share/Steam/steamapps/compatdata/1237970/pfx/drive_c/users/steamuser/AppData
rm -rf "$AD/Local/EADesktop/cache" \
       "$AD/Local/Electronic Arts/EA Desktop/OfflineCache" \
       "$AD/Local/Electronic Arts/EA Desktop/IGOCache"
```

### Rung 3.5 — reset EA Desktop's CEF profile (surgical; for the UI-wedge variant)
Rung 3 clears OfflineCache/IGOCache but NOT the CEF browser profile where a wedged
web-UI / blank-window lives. On 2026-06-13 this still didn't fix it, but it's worth a
shot before nuking (regenerates; may force an EA re-login):
```bash
EAD=~/.local/share/Steam/steamapps/compatdata/1237970/pfx/drive_c/users/steamuser/AppData/Local/Electronic\ Arts/EA\ Desktop
mv "$EAD/CEF" "$EAD/CEF.bak"   # reversible; EA rebuilds it fresh on next launch
```

### Rung 4 — NUCLEAR: wipe the Proton prefix (last resort; needed 2026-06-13)
Loses EA install + all wine config; requires EA re-login + re-setup. Game files,
mods, and the Northstar `R2Titanfall/` profile live in the game dir and are NOT
touched. Prefer a reversible `mv` over `rm` (the prefix is only ~3 GB):
```bash
cd ~/.local/share/Steam/steamapps/compatdata/
mv 1237970 1237970.broken.bak   # Steam rebuilds 1237970 fresh on next launch
```
Recovery flow (verified 2026-06-13, ~12 min end-to-end):
1. Launch via Steam → first launch rebuilds the prefix (`pfx` reappears ~2-3 min in)
   + the EA app re-installs. **Watch for the EA window** (the broken prefix never
   rendered one; a fresh one does = the fix is working).
2. **Log into EA** → reach the library → **close the EA app**.
3. **Close EA app → Stop TF2 in Steam → clean-launch from Steam.** Let Steam drive
   the link2ea handshake + `Titanfall2.exe`. **Never launch TF2 from inside the EA
   app** — doing so mid-launch leaves a confused `Link2EA.exe` state with no handoff.
4. Game boots **vanilla first** (no `-northstar` → **no nslog**, so success =
   the main menu, not a log) → confirm → re-add `-northstar` → fresh nslog = Northstar
   live. Delete `1237970.broken.bak` once confirmed good.

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
