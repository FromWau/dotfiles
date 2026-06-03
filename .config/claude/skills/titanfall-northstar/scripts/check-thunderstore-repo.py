#!/usr/bin/env python3
"""Validate (and optionally fix) a Titanfall 2 / Northstar mod git repo for
Thunderstore publishing.

Convention enforced (see references/thunderstore-publish.md):
  - Tracked: source + package metadata (manifest.json, icon.png, README.md,
    LICENSE) + script-mod content (mods/<Author.Mod>/...).
  - Gitignored build artifacts live under build/ (and /target for Rust). The
    release .zip is built there and ATTACHED TO THE GITHUB RELEASE, never committed.

Usage:
  check-thunderstore-repo.py [REPO_DIR] [--fix]
Exit code 0 = no errors (warnings allowed), 1 = errors found.
"""
import argparse
import json
import os
import re
import struct
import subprocess
import sys

ERRORS, WARNINGS, OKS, FIXES = [], [], [], []
def err(m): ERRORS.append(m)
def warn(m): WARNINGS.append(m)
def ok(m): OKS.append(m)
def fixed(m): FIXES.append(m)


def png_size(path):
    """Return (w, h) of a PNG by reading the IHDR chunk, or None."""
    try:
        with open(path, "rb") as f:
            head = f.read(24)
        if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
            return None
        return struct.unpack(">II", head[16:24])
    except OSError:
        return None


def git_tracked(repo):
    try:
        out = subprocess.run(["git", "-C", repo, "ls-files"], capture_output=True,
                             text=True, check=True).stdout
        return out.splitlines()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None  # not a git repo / no git


def check_manifest(repo):
    p = os.path.join(repo, "manifest.json")
    if not os.path.isfile(p):
        err("manifest.json missing (required at repo root)")
        return
    try:
        m = json.load(open(p, encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        err(f"manifest.json is not valid JSON: {e}")
        return
    ok("manifest.json is valid JSON")

    name = m.get("name", "")
    if not re.fullmatch(r"[A-Za-z0-9_]{1,128}", name or ""):
        err(f"manifest name {name!r} invalid — only [A-Za-z0-9_], max 128, NO spaces/dots/hyphens")
    else:
        ok(f"manifest name ok: {name}")

    ver = m.get("version_number", "")
    if not re.fullmatch(r"\d+\.\d+\.\d+", ver or ""):
        err(f"version_number {ver!r} must be semver Major.Minor.Patch")
    else:
        ok(f"version_number ok: {ver}")

    desc = m.get("description", "")
    if not isinstance(desc, str) or not desc:
        err("description missing/empty")
    elif len(desc) > 250:
        err(f"description is {len(desc)} chars — Thunderstore max is 250 (trim it)")
    else:
        ok(f"description ok ({len(desc)}/250 chars)")

    if "website_url" not in m or not isinstance(m["website_url"], str):
        err('website_url must be present (empty string "" is allowed)')
    else:
        ok("website_url present")

    if not isinstance(m.get("dependencies"), list):
        err("dependencies must be an array (use [] if none)")
    else:
        ok(f"dependencies ok ({len(m['dependencies'])})")
    return m


def check_required_files(repo):
    icon = os.path.join(repo, "icon.png")
    if not os.path.isfile(icon):
        err("icon.png missing (required, 256x256 PNG)")
    else:
        sz = png_size(icon)
        if sz is None:
            err("icon.png is not a valid PNG")
        elif sz != (256, 256):
            err(f"icon.png is {sz[0]}x{sz[1]} — must be exactly 256x256")
        else:
            ok("icon.png ok (256x256 PNG)")

    readme = os.path.join(repo, "README.md")
    if not os.path.isfile(readme) or os.path.getsize(readme) == 0:
        err("README.md missing or empty (required)")
    else:
        ok("README.md present")

    if not os.path.isfile(os.path.join(repo, "LICENSE")):
        warn("LICENSE missing (recommended)")
    else:
        ok("LICENSE present")


def check_content(repo):
    """A package needs deployable content: mods/<Author.Mod>/mod.json (script
    mods) and/or a build that yields plugins/*.dll (native). Source-only repos
    (Cargo.toml/deploy.sh) build the plugin into the gitignored build/.
    Also checks each mod.json: valid JSON + a Name that EQUALS its folder, so every
    mod is FromWau.* and filterable in the in-game list (Name is the enabledmods key).
    Northstar technically allows Name != folder, but our convention requires matching,
    so a mismatch warns (fix it)."""
    mod_jsons = []
    moddir = os.path.join(repo, "mods")
    if os.path.isdir(moddir):
        for d in sorted(os.listdir(moddir)):
            mj = os.path.join(moddir, d, "mod.json")
            if not os.path.isfile(mj):
                continue
            mod_jsons.append(d)
            try:
                mj_data = json.load(open(mj, encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as e:
                err(f"mods/{d}/mod.json is not valid JSON: {e}")
                continue
            name = mj_data.get("Name", "")
            if not name:
                warn(f"mods/{d}/mod.json has no Name (the mod's id / enabledmods key)")
            elif name != d:
                warn(f"mods/{d}/mod.json Name {name!r} != folder '{d}' — set Name to '{d}' so "
                     f"all your mods are FromWau.* and filterable in-game (Name is the enabledmods key)")
            authors = mj_data.get("Authors", [])
            if "FromWau" not in authors:
                warn(f"mods/{d}/mod.json Authors {authors} should be [\"FromWau\"]")
    is_plugin = os.path.isfile(os.path.join(repo, "Cargo.toml")) or \
        os.path.isfile(os.path.join(repo, "deploy.sh"))
    if mod_jsons:
        ok(f"script content: mods/{', mods/'.join(mod_jsons)}")
    if is_plugin:
        ok("native plugin source present (DLL built into gitignored build/)")
    if not mod_jsons and not is_plugin:
        warn("no mods/<Author.Mod>/mod.json and no plugin source — what does this package ship?")


def check_gitignore_and_artifacts(repo):
    gi = os.path.join(repo, ".gitignore")
    patterns = []
    if os.path.isfile(gi):
        patterns = [l.strip() for l in open(gi, encoding="utf-8")]
    need = ["/build", "/target"] if os.path.isfile(os.path.join(repo, "Cargo.toml")) else ["/build"]
    missing = [n for n in need if n not in patterns and n.lstrip("/") not in patterns]
    if missing:
        warn(f".gitignore should ignore build artifacts: missing {missing}")
    else:
        ok(".gitignore covers build artifacts")

    tracked = git_tracked(repo)
    if tracked is not None:
        zips = [f for f in tracked if f.endswith(".zip")]
        if zips:
            warn(f"zip(s) tracked in git: {zips} — the release zip belongs as a GitHub release ASSET, not committed")
        else:
            ok("no committed .zip (release zip stays a release asset)")
        builtin = [f for f in tracked if f.startswith("build/") or f.startswith("target/")]
        if builtin:
            warn(f"build artifacts tracked in git: {builtin[:3]}{'...' if len(builtin) > 3 else ''}")


def do_fixes(repo):
    # .gitignore: ensure build/ (+ target/ for Rust) are ignored
    gi = os.path.join(repo, ".gitignore")
    want = ["/build"]
    if os.path.isfile(os.path.join(repo, "Cargo.toml")):
        want.append("/target")
    existing = []
    if os.path.isfile(gi):
        existing = [l.strip() for l in open(gi, encoding="utf-8")]
    add = [w for w in want if w not in existing and w.lstrip("/") not in existing]
    if add:
        with open(gi, "a", encoding="utf-8") as f:
            if existing and existing[-1] != "":
                f.write("\n")
            f.write("\n".join(add) + "\n")
        fixed(f".gitignore += {add}")

    # README stub
    readme = os.path.join(repo, "README.md")
    if not os.path.isfile(readme) or os.path.getsize(readme) == 0:
        name = "Mod"
        mp = os.path.join(repo, "manifest.json")
        if os.path.isfile(mp):
            try:
                name = json.load(open(mp)).get("name", "Mod")
            except Exception:
                pass
        open(readme, "w", encoding="utf-8").write(
            f"# {name}\n\nTODO: description.\n\n## Changelog\n\n### 1.0.0\n- Initial release\n")
        fixed("created README.md stub")

    # icon.png placeholder (only if Pillow is available)
    icon = os.path.join(repo, "icon.png")
    if not os.path.isfile(icon) or png_size(icon) != (256, 256):
        try:
            from PIL import Image
            Image.new("RGBA", (256, 256), (24, 24, 37, 255)).save(icon)
            fixed("generated 256x256 icon.png placeholder (replace with a real icon)")
        except ImportError:
            warn("--fix could not make icon.png (Pillow not installed); add a 256x256 PNG manually")

    # untrack a committed zip
    tracked = git_tracked(repo) or []
    for z in [f for f in tracked if f.endswith(".zip")]:
        subprocess.run(["git", "-C", repo, "rm", "--cached", "-q", z])
        fixed(f"git rm --cached {z} (kept on disk, no longer tracked)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo", nargs="?", default=".")
    ap.add_argument("--fix", action="store_true", help="apply safe mechanical fixes")
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)

    if a.fix:
        do_fixes(repo)
    check_manifest(repo)
    check_required_files(repo)
    check_content(repo)
    check_gitignore_and_artifacts(repo)

    print(f"\n== Thunderstore repo check: {repo} ==")
    for m in OKS:
        print(f"  \033[32mok\033[0m   {m}")
    for m in FIXES:
        print(f"  \033[36mfix\033[0m  {m}")
    for m in WARNINGS:
        print(f"  \033[33mwarn\033[0m {m}")
    for m in ERRORS:
        print(f"  \033[31mERR\033[0m  {m}")
    print(f"\n{len(ERRORS)} error(s), {len(WARNINGS)} warning(s)"
          + (f", {len(FIXES)} fix(es) applied" if FIXES else ""))
    sys.exit(1 if ERRORS else 0)


if __name__ == "__main__":
    main()
