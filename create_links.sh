#!/usr/bin/env bash

function link_and_backup() {
    source_dir=$1
    target_dir=$2
    items=("${@:3}")

    for item in "${items[@]}"; do
        src="$source_dir$item"
        dest="$target_dir$item"

        if [ -e "$dest" ] && [ ! -L "$dest" ]; then
            echo "Backing up: $dest"
            mv "$dest" "${dest}_backup"
        fi

        ln -sfn "$src" "$dest"
        echo "Linked $src -> $dest"
    done
}

function link_config() {
    source_dir=~/Projects/dotfiles/.config/
    target_dir=~/.config/
    items=(
        ags bat beets btop dunst fastfetch fish git hypr 
        ideavim kitty lazygit matugen mpd mpDris2 mpv 
        ncmpcpp npm nvim pacman systemd wal walker wget 
        starship.toml tealdeer xdg-desktop-portal
    )

    link_and_backup "$source_dir" "$target_dir" "${items[@]}"
}

function link_local_bin() {
    source_dir=~/Projects/dotfiles/.local/bin/
    target_dir=~/.local/bin/
    items=(
        battery-notify download-spot find-similar-pics fix-bitwarden 
        fzf-previewer git-reset-to-parent hypr-wal qr reddit-images 
        ssh-key-fzf toggle-scale forwarding gpu-enable gpu-disable
    )

    link_and_backup "$source_dir" "$target_dir" "${items[@]}"
}

function link_local_share() {
    source_dir=~/Projects/dotfiles/.local/share/
    target_dir=~/.local/share/
    items=(applications icons)

    link_and_backup "$source_dir" "$target_dir" "${items[@]}"
}

link_config
link_local_bin
link_local_share

echo "DONE"
