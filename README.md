# dotfiles

Personal Linux desktop config — Hyprland (Wayland) + fish + nvim + AGS bar,
with a Matugen-driven Material You theme pipeline.

## Quick start

```
git clone <this-repo> ~/Projects/dotfiles
cd ~/Projects/dotfiles
./create_links.sh                 # idempotent; backs up any colliding files
```

That's it. `create_links.sh` symlinks the tree into `$HOME`.
## Layout

```
.config/         per-application config, symlinked into ~/.config/
  hypr/          Hyprland — Lua-based config (hyprland.lua + conf/)
  ags/           Astal/AGS bar and widgets (TypeScript, GTK4)
  fish/          fish shell config
  nvim/          Neovim config
  matugen/       wallpaper -> theme generator (templates emit per-app colors)
  kitty/ ghostty/ alacritty configs
  ...            (one dir per app — see ls)

.config/claude/  shared Claude Code config (CLAUDE.md, skills, agents,
                 plugins/installed_plugins.json). Linked into ~/.claude/
                 piecewise so runtime state stays local.

.local/bin/      utility scripts and tools symlinked into ~/.local/bin
  hyprstate      Rust CLI — read/write the desktop state file (binary
                 committed; source under hyprstate/)
  hypr-wal       random wallpaper + matugen + awww
  gpu-{en,dis}able   nvidia drain-mode helpers
  battery-notify, fix-bitwarden, find-similar-pics, ...

.local/share/    applications/ and icons/ shipped with the repo

hyprstate/       Rust crate source for the hyprstate CLI

create_links.sh  the installer — symlinks the tree into $HOME and runs
                 a skip-worktree pass for tracked-but-gitignored files
```

## Architecture: state.json as single source of truth

Anything that changes during a session — current display mode, wallpaper,
cursor theme — lives in **`$XDG_STATE_HOME/hypr/state.json`**:

```json
{
  "DISPLAY_MODE": "game",
  "WALLPAPER": "/home/.../wallpapers/xyz.png",
  "CURSOR_THEME": "catppuccin-macchiato-green-cursors"
}
```

- **Sole writer**: `hyprstate` CLI (atomic temp+rename). Every writer
  (matugen `cursor-theme.sh`, `hypr-wal`, AGS) calls
  `hyprstate set KEY VALUE [--reload] [--notify ...]`.
- **Hyprland reads** state in `~/.config/hypr/conf/display_mode.lua` via
  `jq` on every `hyprctl reload`, then applies `hl.monitor(...)` and
  `hyprctl setcursor` for the active mode.
- **AGS reads** state via a Gio directory monitor in `utils/state.ts`;
  the reactive `currentState` mirrors disk and re-renders the bar +
  widgets automatically when state.json changes — regardless of which
  process wrote it.

## Notable scripts

- **`hyprstate get|set|cycle|path`** — see `hyprstate --help`. Used by
  keybindings, matugen, AGS, hypr-wal.
- **`hypr-wal`** — picks one (or N, similarity-matched) wallpapers,
  invokes matugen, applies via awww, writes WALLPAPER to state.
- **`gpu-disable`/`gpu-enable`** — drain a Nvidia GPU before Hyprland
  exit (so the next session boots with the chosen GPU only).
- **`fix-bitwarden`** — Hyprland socket listener that auto-floats the
  Bitwarden Firefox extension popup window.
- **`find-similar-pics`** — pHash-based image similarity. Used by
  hypr-wal for multi-monitor matching.

