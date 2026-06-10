---
name: dotfiles
description: How Tobias's ~/Projects/dotfiles repo is structured and deployed (create_links.sh symlink allow-lists, the folded ~/.config/systemd symlink, gitignored service enablement) plus the design rules for building user-level, clone-to-reproduce automation on his Arch + Hyprland desktop (no system-Python daemons, nothing in /etc, prefer C-binary tooling). Load this whenever touching ~/Projects/dotfiles or config that lives there, editing create_links.sh, adding a script to .local/bin or a systemd --user service, building any auto-mount / udev / daemon / background automation, or working with the Hyprland / AGS / dunst / fish setup — even when the user doesn't name the repo.
---

# Dotfiles & Linux desktop automation (Arch + Hyprland)

Reference for working in Tobias's personal environment: how the dotfiles repo
deploys, and how to build automation that fits it. Overarching goal:
**clone-to-reproduce** — a fresh machine comes up working from `git clone` +
`./create_links.sh` + a couple of `systemctl --user enable`s, with **zero root**
and **no hand-edited system files**. Design for that, not for "works on my box".

## Design rules for automation / daemons

These come from real friction; ignore them and the solution won't survive a
reinstall or a Python/system upgrade.

- **User-level and repo-reproducible only.** Avoid anything that can't be
  symlinked out of the repo. No files in `/etc` — e.g. a udev *rule* there
  needs root and breaks clone-to-reproduce. Find the user-space equivalent
  (for udev: a user service running `udevadm monitor`, which can read the
  processed UDEV event stream unprivileged — no rule file needed).
- **No system-Python daemons / no raw system site-packages.** A long-running
  script importing system `gi`/PyGObject etc. is one `python` upgrade away from
  breaking; treat it as a code smell.
- **Prefer C-binary tooling over language bindings.** `udevadm monitor` + `gio`
  (glib2) for event-driven work, `notify-send` for notifications, `udisks` /
  `udiskie` for block devices. Core libraries, far more stable than an
  interpreter stack.
- **Wire it as a `systemd --user` service**, enabled per-machine.

Worked example already in the repo: `.local/bin/gvfs-mtp-automount` +
`gvfs-mtp-automount.service` auto-mount MTP phones on plug-in via a
`udevadm monitor` → `gio mount` watcher (sticky `notify-send` with an Open
action), no root, no `/etc`; `udiskie.service` handles USB block devices.

## How the repo deploys: `create_links.sh`

No stow/chezmoi — a hand-rolled `create_links.sh` symlinks the tree into `$HOME`
from explicit allow-lists. The consequences that bite if you forget them:

- **`.config/<item>` is linked as a whole directory** from the `link_config`
  list, and `systemd` is in that list — so **`~/.config/systemd` is a folded
  dir-symlink into the repo**. A unit written to `~/.config/systemd/user/` is
  already in-repo, and `systemctl --user enable` writes its `*.target.wants/`
  symlink there too.
- **`.local/bin` uses per-file symlinks** from the `link_local_bin` array. A
  **new script must be added to that array** or `create_links.sh` won't deploy
  it elsewhere — putting the file in the repo is not enough.
- **Enablement is not version-controlled.** `*.target.wants/` symlinks are
  gitignored, so services are enabled **per-machine** with
  `systemctl --user enable` (same as the existing `ssh-agent` / `mpd`). Tell
  the user the enable step; don't expect git to carry it.
- Editing CLAUDE.md / skills: `~/.claude/CLAUDE.md`, `~/.claude/skills`, etc. are
  themselves symlinks from `.config/claude/` (via `link_claude`). Tools refuse
  to write through the symlinked file — edit the real repo path
  `~/Projects/dotfiles/.config/claude/...`.
- Commit style: terse `topic: lowercase summary` one-liners; `claude:` prefix
  for skill/config housekeeping. The repo is git, so changes are revertible.

## Environment facts

- **`default.target` is the autostart hook** (where `ssh-agent` / `mpd` hang
  off). **`graphical-session.target` is NOT active** in this session — don't
  wire user services to it expecting them to start.
- **Hyprland** configured in **Lua** (`~/.config/hypr/*.lua`, not
  `hyprland.conf`); autostart entries live in `conf/startup.lua` via
  `hl.exec_cmd`.
- **AGS** is the desktop shell (`ags.service`). **dunst** is the notification
  daemon, with `mouse_middle_click = do_action` (notification action buttons
  fire on **middle-click**). **fish** shell; **kitty** / **ghostty** terminals.
- Gradle home is XDG (`$XDG_DATA_HOME/gradle`), not `~/.gradle`.
