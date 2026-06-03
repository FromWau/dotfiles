#!/usr/bin/env bash
# Build + install a Titanfall 2 / Northstar mod into a game profile. Lives in the
# titanfall-northstar skill so no mod needs its own deploy script — run it from (or
# pointed at) any mod repo. Handles native-plugin (Cargo) and script-mod repos.
#
# It stages the Thunderstore package under the gitignored build/ (which also yields
# build/<Name>.zip for a GitHub release asset — see references/thunderstore-publish.md),
# then installs that package into <profile>/packages/<Author-Name-Version>/.
#
# Usage:  install.sh [repo] [-p PROFILE] [--author NAME]
#   repo        mod repo dir (default: current dir)
#   -p PROFILE  R2Titanfall (default) | R2Northstar | all
#   --author    package author / Thunderstore team (default: $TS_AUTHOR or FromWau)
set -euo pipefail

REPO="."; PROFILE="R2Titanfall"; AUTHOR="${TS_AUTHOR:-FromWau}"
TF2="${TF2:-$HOME/.local/share/Steam/steamapps/common/Titanfall2}"
while [ $# -gt 0 ]; do
    case "$1" in
        -p|--profile) PROFILE="${2:?-p needs a value}"; shift ;;
        --author)     AUTHOR="${2:?--author needs a value}"; shift ;;
        -*) echo "unknown flag: $1" >&2; exit 2 ;;
        *)  REPO="$1" ;;
    esac
    shift
done
REPO="$(cd "$REPO" && pwd)"

command -v jq  >/dev/null || { echo "need jq";  exit 1; }
command -v zip >/dev/null || { echo "need zip"; exit 1; }
[ -f "$REPO/manifest.json" ] || { echo "no manifest.json in $REPO"; exit 1; }

NAME=$(jq -r '.name' "$REPO/manifest.json")
VER=$(jq -r '.version_number' "$REPO/manifest.json")
[ -n "$NAME" ] && [ "$NAME" != null ] && [ -n "$VER" ] && [ "$VER" != null ] \
    || { echo "manifest.json missing name/version_number"; exit 1; }
PKG="${AUTHOR}-${NAME}-${VER}"
STAGE="$REPO/build/$PKG"; ZIP="$REPO/build/${NAME}.zip"

case "$PROFILE" in
    all) PROFILES=(R2Titanfall R2Northstar) ;;
    *)   PROFILES=("$PROFILE") ;;
esac

# 1) build native plugin if this is a Rust project
if [ -f "$REPO/Cargo.toml" ]; then
    echo "==> cargo build --release (x86_64-pc-windows-gnu)"
    ( cd "$REPO" && cargo build --release --target x86_64-pc-windows-gnu )
fi

# 2) stage the package (build/ is gitignored)
echo "==> staging $PKG"
rm -rf "$STAGE"; mkdir -p "$STAGE"
for f in manifest.json icon.png README.md LICENSE; do
    [ -f "$REPO/$f" ] && cp "$REPO/$f" "$STAGE/"
done
[ -d "$REPO/mods" ] && cp -r "$REPO/mods" "$STAGE/mods"
for srcdir in "$REPO/target/x86_64-pc-windows-gnu/release" "$REPO/plugins"; do
    [ -d "$srcdir" ] || continue
    while IFS= read -r -d '' dll; do
        mkdir -p "$STAGE/plugins"; cp "$dll" "$STAGE/plugins/"
    done < <(find "$srcdir" -maxdepth 1 -name '*.dll' -print0)
done
[ -d "$STAGE/mods" ] || [ -d "$STAGE/plugins" ] \
    || { echo "ERROR: no mods/ and no plugin DLL to install"; exit 1; }

# 3) zip (files at the ZIP ROOT) for the release asset
rm -f "$ZIP"; ( cd "$STAGE" && zip -q -r "$ZIP" . )

# 4) install into the chosen profile(s)
# Refuse to overwrite while the game is running: `cp` truncates the existing DLL in place, which
# corrupts the live memory-mapping and can hard-crash TF2. (The build above is always safe.)
# Match the REAL game/launcher process, not the EA proxy that merely keeps "Titanfall2.exe?" in
# its args: the running game's cmdline has the exe followed by a space + launch flags
# (`Titanfall2.exe -northstar …`), which the proxy (`Titanfall2.exe? %20…`) does not.
# ([T] char-class avoids pgrep matching this script's own / a parent shell's command line.)
if pgrep -f '[T]itanfall2(_trial)?\.exe |[N]orthstarLauncher\.exe ' >/dev/null 2>&1; then
    echo "ERROR: Titanfall 2 is running — built + zipped, but NOT installing (overwriting the"
    echo "       mapped plugin DLL can crash the game). Quit the game, then re-run to install."
    exit 0
fi
for profile in "${PROFILES[@]}"; do
    base="$TF2/$profile"
    [ -d "$base" ] || { echo "skip: $profile (not found)"; continue; }
    dest="$base/packages/$PKG"
    rm -rf "$dest"; mkdir -p "$dest"
    cp -r "$STAGE/." "$dest/"
    echo "==> installed to $profile/packages/$PKG"
done

echo "Restart the game (plugins/keyvalues load at startup; no hot-reload)."
echo "Release zip: $ZIP  ->  gh release create v${VER} \"$ZIP\" --title v${VER} --notes ..."
