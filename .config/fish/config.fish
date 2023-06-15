# Env variables
set -x EDITOR nvim
set -x BROWSER firefox

set -x XDG_CONFIG_HOME "$HOME/.config"
set -x XDG_DATA_HOME "$HOME/.local/share"
set -x XDG_STATE_HOME "$HOME/.local/state"
set -x XDG_CACHE_HOME "$HOME/.cache"

set -x ANDROID_HOME "$XDG_DATA_HOME"/android
set -x GRADLE_USER_HOME "$XDG_DATA_HOME"/gradle
set -x PASSWORD_STORE_DIR "$XDG_DATA_HOME"/password-store
set -x GOPATH "$XDG_DATA_HOME"/go
set -x GNUPGHOME "$XDG_DATA_HOME"/gnupg
set -x CARGO_HOME "$XDG_DATA_HOME"/cargo
set -x WINEPREFIX "$XDG_DATA_HOME"/wineprefixes/default
set -x TERMINFO "$XDG_DATA_HOME"/terminfo
set -x TERMINFO_DIRS "$XDG_DATA_HOME"/terminfo:/usr/share/terminfo

set -x NPM_CONFIG_USERCONFIG "$XDG_CONFIG_HOME"/npm/npmrc
set -x XINITRC "$XDG_CONFIG_HOME"/X11/xinitrc
set -x WGETRC "$XDG_CONFIG_HOME"/wget/wgetrc
set -x ZDOTDIR "$XDG_CONFIG_HOME"/zsh
set -x GTK2_RC_FILES "$XDG_CONFIG_HOME"/gtk-2.0/gtkrc
set -x _JAVA_OPTIONS -Djava.util.prefs.userRoot="$XDG_CONFIG_HOME"/java

set -x HISTFILE "$XDG_STATE_HOME"/bash/history

set -x XAUTHORITY "$XDG_RUNTIME_DIR"/Xauthority

set -x MANPAGER "sh -c 'col -bx | bat -l man -p'"
set -x LESSHISTFILE -
set -x FZF_DEFAULT_COMMAND "fd --type f --strip-cwd-prefix --hidden --follow --exclude .git"

fish_vi_key_bindings insert

fzf_key_bindings

fish_add_path ~/.local/bin

starship init fish | source

zoxide init fish | source


# abbr
abbr icat 'kitty +kitten icat'
abbr mirror 'sudo reflector --country AT --latest 50 --sort rate --save /etc/pacman.d/mirrorlist'
abbr ls 'exa --icons --all --group-directories-first --color always'
abbr ps procs
abbr grep rg
abbr fzf 'fzf -d "|" --cycle -i'
abbr cd z
abbr vim nvim
abbr v nvim
abbr cat 'bat -p --color always'
abbr yeet 'yay -Rns'
abbr bed 'hyprctl keyword monitor HDMI-A-1,3840x2160@60,0x0,2'
abbr desk 'hyprctl keyword monitor HDMI-A-1,3840x2160@60,0x0,1'
abbr reload 'source ~/.config/fish/config.fish'


# functions
function fdir -d "Jump to selected zoxide dir"
    set -l selected_dir (zoxide query -l | fzf --preview "exa -lah --color always --group-directories-first {}" --cycle -i -d "|" --exact --prompt "z into dir: ")
    if count $selected_dir >/dev/null
        z $selected_dir
        echo "Jumped to $selected_dir"
        exa --icons --all --group-directories-first --color always
    end
end

function mcd -d "Creates and enters dir"
    mkdir -p -- $argv && z $argv
end

function rm-fzf -d "Delete multiple selected files"
    set -l selected_files (fzf-previewer -m)
    if count $selected_files >/dev/null
        echo $selected_files | xargs rm
    end
end

function ff -d "Search for files and open in nvim"
    fzf-previewer --bind "enter:execute(nvim {1} < /dev/tty)" --cycle -i -d "|" --exact --prompt "Open in nvim: "
end

function fp -d "Search for git repos and jump to selected repo"
    set -l repo (fd --type d --color always --strip-cwd-prefix --exec find {} -type d -name .git | sort -u | sed 's/\/.git$//' | fzf -d "|" --cycle -i)
    if count $repo >/dev/null
        z $repo
        echo "Jumped to repo $repo"
    end
end

function fpl -d "Search for git repos and open repo in lazygit"
    set -l dir (pwd)
    set -l repo (fd --type d --color always --strip-cwd-prefix --exec find {} -type d -name .git | sort -u | sed 's/\/.git$//' | fzf -d "|" --cycle -i)
    if count $repo >/dev/null
        z $repo
        lazygit
        z $dir
    end
end
