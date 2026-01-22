#!/usr/bin/env bash

usage() {
    cat <<EOF
Usage: $(basename "$0") [SOURCE] [TARGET]

Create symlinks from dotfiles repo to target home directory.
Idempotent - safe to run multiple times.

Arguments:
  SOURCE    Path to dotfiles repo (default: script directory)
  TARGET    Target home directory (default: \$HOME)

Examples:
  $(basename "$0")                      # Link script dir -> \$HOME
  $(basename "$0") . /tmp/test          # Link current dir -> /tmp/test
  $(basename "$0") ~/dotfiles ~         # Explicit source and target

Options:
  -h, --help    Show this help message
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

# Set SOURCE_HOME and TARGET_HOME for testing (defaults: script dir, $HOME)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_HOME=$(cd "${1:-$SCRIPT_DIR}" && pwd)
TARGET_HOME=${2:-$HOME}

CHANGED=0
OK=0
BACKED_UP=0
ERRORS=0

function link_and_backup() {
    source_dir=$1
    target_dir=$2
    items=("${@:3}")

    for item in "${items[@]}"; do
        src="$source_dir$item"
        dest="$target_dir$item"

        # Source doesn't exist
        if [ ! -e "$src" ]; then
            echo "ERROR: Source not found: $src"
            ((ERRORS++))
            continue
        fi

        # Already correctly linked
        if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
            echo "OK: $dest"
            ((OK++))
            continue
        fi

        # Exists but not a symlink - backup
        if [ -e "$dest" ] && [ ! -L "$dest" ]; then
            echo "BACKUP: $dest -> ${dest}.backup"
            rm -rf "${dest}.backup"
            mv "$dest" "${dest}.backup"
            ((BACKED_UP++))
        fi

        # Wrong symlink or doesn't exist - create/update
        ln -sfn "$src" "$dest"
        echo "LINKED: $dest -> $src"
        ((CHANGED++))
    done
}

function link_config() {
    source_dir="$SOURCE_HOME/.config/"
    target_dir="$TARGET_HOME/.config/"
    items=(
        ags bat beets btop dunst fastfetch fish git hypr
        ideavim kitty lazygit matugen mpd mpDris2 mpv
        ncmpcpp npm nvim pacman systemd wal walker wget
        starship.toml tealdeer xdg-desktop-portal
    )

    link_and_backup "$source_dir" "$target_dir" "${items[@]}"
}

function link_local_bin() {
    source_dir="$SOURCE_HOME/.local/bin/"
    target_dir="$TARGET_HOME/.local/bin/"
    items=(
        battery-notify download-spot find-similar-pics fix-bitwarden
        fzf-previewer git-reset-to-parent hypr-wal qr reddit-images
        ssh-key-fzf gpu-enable gpu-disable
    )

    link_and_backup "$source_dir" "$target_dir" "${items[@]}"
}

function link_local_share() {
    source_dir="$SOURCE_HOME/.local/share/"
    target_dir="$TARGET_HOME/.local/share/"
    items=(applications icons)

    link_and_backup "$source_dir" "$target_dir" "${items[@]}"
}

# Ensure target directories exist
mkdir -p "$TARGET_HOME/.config"
mkdir -p "$TARGET_HOME/.local/bin"
mkdir -p "$TARGET_HOME/.local/share"

link_config
link_local_bin
link_local_share

echo ""
echo "=== Summary ==="
echo "Source: $SOURCE_HOME"
echo "Target: $TARGET_HOME"
echo "OK (no change): $OK"
echo "Linked: $CHANGED"
echo "Backed up: $BACKED_UP"
echo "Errors: $ERRORS"
