# Env variables
set -x EDITOR nvim
set -x BROWSER firefox

set -x XDG_CONFIG_HOME "$HOME/.config"
set -x XDG_DATA_HOME "$HOME/.local/share"
set -x XDG_STATE_HOME "$HOME/.local/state"
set -x XDG_CACHE_HOME "$HOME/.cache"

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
set -x SSH_AUTH_SOCK "$XDG_RUNTIME_DIR"/ssh-agent.socket

set -x MPD_HOST "$XDG_RUNTIME_DIR"/mpd/socket

set -x CUDA_CACHE_PATH "$XDG_CACHE_HOME"/nv

set -x MANPAGER "sh -c 'bat -l man -p'"
set -x LESSHISTFILE -
set -x FZF_DEFAULT_COMMAND "fd --type f --strip-cwd-prefix --hidden --follow --exclude .git"
set -x DELTA_FEATURES "+side-by-side +dark +syntax-theme base16-256 +true-color +navigate"

fish_vi_key_bindings insert

# fzf_key_bindings

fish_add_path ~/.local/bin
fish_add_path ~/.nix-profile/bin

starship init fish | source

zoxide init fish | source


# abbr
abbr icat 'kitty +kitten icat'
abbr mirror 'sudo reflector --country AT --latest 50 --sort rate --save /etc/pacman.d/mirrorlist'
abbr ls 'eza --icons --all --group-directories-first --color always'
abbr ll 'eza --icons --all --group-directories-first --color always --long'
abbr llh 'eza --icons --all --group-directories-first --color always --long | head -10'
abbr tree 'eza --icons --all --group-directories-first --color always --tree --ignore-glob ".git*"'
abbr ps procs
abbr grep rg
abbr fzf 'fzf -d "|" --cycle -i --reverse'
abbr cd z
abbr zz 'z -'
abbr vim nvim
abbr v nvim
abbr cat 'bat -p --color always'
abbr yeet 'yay -Rns'
abbr reload 'source ~/.config/fish/config.fish'
abbr lg lazygit
abbr sc systemctl
abbr chx 'chmod +x'
abbr clear-nvim 'rm -rf ~/.cache/nvim ~/.local/share/nvim ~/.local/state/nvim'
abbr .. 'cd ..'
abbr ... 'cd ../..'
abbr .... 'cd ../../..'
abbr ags 'bash -c "cd ~/.config/ags/ && ags"'
abbr skf 'ssh-key-fzf'

# functions
function nvim -d "Open nvim and handle arg path"
    set -l dir (pwd)
    if count $argv >/dev/null
        if test -d $argv[1]
            cd $argv[1]
            command nvim
            cd $dir
        else
            command nvim $argv
        end
    else
        command nvim
    end
end
 

function fdir -d "Jump to selected zoxide dir"
    set -l selected_dir (zoxide query -l | fzf --preview "eza -lah --color always --group-directories-first {}" --cycle -i -d "|" --exact --prompt "z into dir: ")
    if count $selected_dir >/dev/null
        z $selected_dir
        eza --icons --all --group-directories-first --color always
    end
end

function mcd -d "Creates and enters dir"
    mkdir -p -- $argv && z $argv
end

function rm-fzf -d "Delete multiple selected files"
    set -l selected_files (fzf-previewer -m --reverse --cycle -i -d "|" --prompt "Select files to delete: ")
    if count $selected_files >/dev/null
        echo $selected_files | xargs rm -v
    end
end

function ff -d "Search for files and open in nvim"
    set -l selected_files (fzf-previewer --cycle -i -d "|" --prompt "Open in nvim: ")
    if count $selected_files >/dev/null
        echo "$selected_files" | xargs nvim
    end
end

function fp -d "Search for git repos and jump to selected repo"
    set -l repo (fd --type d --hidden --no-ignore-vcs --base-directory ~ --strip-cwd-prefix --exclude .cache --exclude .gradle --exclude .local "^.git\$" -x echo {//} | fzf -d "|" --cycle -i --reverse)
    if count $repo >/dev/null
        z $repo
    end
end

function fpl -d "Search for git repos and open repo in lazygit"
    set -l dir (pwd)
    set -l repo (fd --type d --hidden --no-ignore-vcs --base-directory ~ --strip-cwd-prefix --exclude .cache --exclude .gradle --exclude .local "^.git\$" -x echo {//} | fzf -d "|" --cycle -i --reverse)
    if count $repo >/dev/null
        z $repo
        lazygit
        z $dir
    end
end

function cp-to-dot -d "copies the given item to ~/Projects/dotfiles"
    set -l selected_files (fzf-previewer -m --reverse --cycle -i -d "|" --prompt "Select files to cp to dotfiles repo: ")
    if count $selected_files >/dev/null
        set -l origin_files (echo $selected_files | xargs realpath --relative-to=$HOME)
        for file in $origin_files
            mkdir -p ~/Projects/dotfiles/(dirname $file)
            cp -pr ~/$file ~/Projects/dotfiles/$file
        end
    end
end

function copy-content -d "Send file content to clipboard"
    if count $argv >/dev/null
        cat $argv | wl-copy
    end
end

function scale-up -d "Scales up the monitor"
    set -l monitors (cat ~/.config/hypr/conf/io/monitor.conf | rg monitor=)
    set -l content (echo $monitors | cut -d ',' -f-3 | xargs -I {} echo "{}, 1.6")
    ~/.config/hypr/scripts/update_file.sh "temp/temp.conf" "$content"
end

function hypr-clear-temp -d "Clear temp settings in hyprland"
    ~/.config/hypr/scripts/update_file.sh "temp/temp.conf" "clear"
    swww restore
end
