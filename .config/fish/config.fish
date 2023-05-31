# Alias
alias icat='kitty +kitten icat'
alias mirror='sudo reflector --country AT --latest 50 --sort rate --save /etc/pacman.d/mirrorlist'
alias ls='exa --icons --all --group-directories-first'
alias ps='procs'
alias grep='rg'
alias vim='nvim'
alias cat='bat -p'
alias yeet='yay -Rns'

alias bed='hyprctl keyword monitor HDMI-A-1,3840x2160@60,0x0,2'
alias desk='hyprctl keyword monitor HDMI-A-1,3840x2160@60,0x0,1'

alias ff='fzf --preview "bat --color always {}"--cycle -i --bind "enter:execute(vim {1} < /dev/tty)" --exact --prompt "Open in nvim: "'
alias fp='fzf-cat'

# Env variables
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

# Append dirs to path
fish_add_path ~/.local/bin

# wal -R -e -n -q

# start zoxide
zoxide init fish | source
alias cd='z'

# start starship
starship init fish | source
