# Publishing a Titanfall/Northstar mod to Thunderstore (validate + fix a repo)

How to lay out, validate, and release a TF2/Northstar mod repo as a Thunderstore
package. Run the validator to check (and auto-fix the mechanical parts):

```bash
python3 ~/.claude/skills/titanfall-northstar/scripts/check-thunderstore-repo.py <repo> [--fix]
```
It reports errors (block publishing) and warnings, and `--fix` applies the safe
mechanical fixes (`.gitignore` entries, README stub, placeholder icon, untracking a
committed zip). Things needing judgment (description too long, invalid name) are
reported, not silently changed.

## Canonical repo layout
Tracked in git = source + package metadata + script content. Build artifacts are
**gitignored under `build/`** (present locally for convenience, never committed); the
release `.zip` is built there and **attached to the GitHub release**, not committed.

```
<repo>/                          # repo root == the Thunderstore package root
├── manifest.json                # required (rules below)
├── icon.png                     # required, EXACTLY 256x256 PNG
├── README.md                    # required, UTF-8, rendered on the package page
├── LICENSE                      # recommended
├── mods/Author.ModName/...      # script-mod content (if any), dotted folder name
│   └── mod.json
├── <plugin source>              # native plugins: Cargo.toml, crates/, .cargo/ (NO per-mod deploy script — use the skill's install.sh)
├── .gitignore                   # ignores /build (and /target for Rust)
└── build/                       # GITIGNORED — assembled package + the .zip live here
```
### Four names, four FORMS — keep each in its own form
The same mod appears in four places, each with its own required form (don't put dots in the
manifest name, don't drop the `FromWau.` from the mod `Name`, etc.):
| where | form | example |
|---|---|---|
| GitHub repo / dir | bare PascalCase, no prefix | `MatchReadyAudio` |
| Thunderstore `manifest.json` `name` | `[A-Za-z0-9_]` ≤128, no dots/spaces | `MatchReadyAudio` |
| install / package dir | `Author-Mod-Version` (hyphens, semver) | `FromWau-MatchReadyAudio-1.0.2` |
| Northstar `mod.json` `Name` (= its folder) | `Author.PascalModName` | `FromWau.MatchReadyAudio` |

The `mod.json` `Name` is the *Northstar* identity (keys `enabledmods`, shown in the in-game
mod list) and **must equal its folder = `FromWau.<Pascal>`** so all your mods group as
`FromWau.*` and are filterable in-game (see `references/mod-template.md`). The manifest
`name` is the *Thunderstore* package name (bare, no dots) — a different form, not the same
string. The validator checks `manifest.json` strictly and **warns if a `mod.json` `Name` ≠
its folder** (fix it).

## manifest.json rules (Thunderstore manifest v1 — verified)
```json
{ "name": "MyMod", "version_number": "1.0.0",
  "website_url": "https://github.com/FromWau/MyMod",
  "description": "One line, <=250 chars.", "dependencies": [] }
```
- **name**: `[A-Za-z0-9_]` only, max 128 — **no spaces, dots, or hyphens** (underscores
  render as spaces on Thunderstore).
- **version_number**: semver `Major.Minor.Patch`.
- **description**: **max 250 characters** (hard limit — the validator counts it).
- **website_url**: optional, but the key must exist — use `""` if none.
- **dependencies**: array of `"{team}-{package}-{version}"` strings (`[]` if none).

## Required files (must sit at the ZIP root)
- `manifest.json`, `icon.png` (256x256 PNG), `README.md` (UTF-8). LICENSE recommended.
- The deployable content (`mods/...` and/or `plugins/*.dll`) is also at the zip root.

## Build + release flow (zip → release asset, not committed)
The skill automates steps 1–2 (build → stage `build/` → zip) and installs into a
profile — **no mod needs its own deploy script**; run the skill's `install.sh` from
(or pointed at) any mod repo:
```bash
~/.claude/skills/titanfall-northstar/scripts/install.sh [repo] -p R2Titanfall   # or: -p all
```
It builds (Cargo repos), stages the package under the gitignored `build/`, writes
`build/<Name>.zip`, and installs into `<profile>/packages/`. Then do step 3 (the GitHub
release) with that zip. Manually, the steps are:

1. Assemble the package into `build/` so its **root** holds the files (Thunderstore
   rejects a zip that nests everything under a subdir):
   ```
   build/{manifest.json, icon.png, README.md, LICENSE, mods/ and/or plugins/<dll>}
   ```
   For a native plugin, the deploy/build script compiles the DLL into
   `build/plugins/<name>.dll`. For a script mod, copy `mods/` in.
2. Zip from inside `build/` so files are at the zip root:
   ```bash
   ( cd build && zip -r ../build/<Name>.zip . )   # NOT the build/ dir itself
   ```
3. Tag + create the GitHub release and **attach the zip as an asset** (it is NOT in the repo):
   ```bash
   gh release create v1.0.0 build/<Name>.zip --title "v1.0.0" --notes "..."
   # or: gh release upload v1.0.0 build/<Name>.zip
   ```
4. Publish to Thunderstore: upload that same zip at thunderstore.io (Upload), or wire up
   automated publishing with the Thunderstore CLI (`tcli`) / their GitHub Action so a new
   GitHub release pushes the package. Either way the **release asset is the source of truth**.

## Validate-and-fix checklist (what the script enforces)
- manifest.json: valid JSON; name/version/description/website_url/dependencies per rules.
- icon.png present, valid PNG, exactly 256x256.
- README.md present + non-empty; LICENSE present (warn).
- Content present: `mods/<Author.Mod>/mod.json` and/or plugin source (Cargo.toml/deploy.sh).
- `.gitignore` ignores `/build` (and `/target` for Rust).
- No `.zip` and no `build/`/`target/` files tracked in git (the zip is a release asset).

Run it before every release; treat errors as blocking.
