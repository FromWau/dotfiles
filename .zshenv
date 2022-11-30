# default apps
export EDITOR="nvim"
export TERMINAL="kitty"
export BROWSER="firefox"
export EXPLORER="ranger"
export RANGER_LOAD_DEFAULT_RC="FALSE"


# path
export PATH=~/.local/bin/:~/.local/bin/npm-global/bin:$PATH

# cleaning up home folder
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XINITRC="$XDG_CONFIG_HOME"/X11/xinitrc
export LESSHISTFILE="-"
export WGETRC="$XDG_CONFIG_HOME"/wget/wgetrc
export PASSWORD_STORE_DIR="$XDG_DATA_HOME"/password-store
export GOPATH="$XDG_DATA_HOME"/go
export CARGO_HOME="$XDG_DATA_HOME"/cargo
export ZDOTDIR="$XDG_CONFIG_HOME"/zsh
export WINEPREFIX="$XDG_DATA_HOME"/wineprefixes/default
export FEHBG_PATH="$XDG_CONFIG_HOME"/feh

