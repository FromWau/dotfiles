if [ -n "$XDG_SESSION_DESKTOP" ]; then
    mkdir -p "$HOME/.local/state/greetd"
    exec >"$HOME/.local/state/greetd/session.log" 2>&1
fi
