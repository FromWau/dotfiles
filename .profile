# The environment lives in ~/.config/environment.d, the one source for every login; greetd's sh reads it here.
set -a
eval "$(/usr/lib/systemd/user-environment-generators/30-systemd-environment-d-generator)"
set +a

if [ -n "$XDG_SESSION_DESKTOP" ]; then
    mkdir -p "$HOME/.local/state/greetd"
    exec >"$HOME/.local/state/greetd/session.log" 2>&1
fi
