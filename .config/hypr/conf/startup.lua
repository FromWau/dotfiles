-- Autostart.

hl.on("hyprland.start", function()
    -- Wallpaper
    hl.exec_cmd "awww-daemon"
    hl.exec_cmd "sleep 2 && awww restore"

    -- Notifications / players
    hl.exec_cmd "battery-notify"
    hl.exec_cmd "playerctld daemon"
    hl.exec_cmd "mpDris2 --use-journal"

    hl.exec_cmd "dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP HYPRLAND_INSTANCE_SIGNATURE XDG_SESSION_TYPE && systemctl --user start hyprland-session.target ags.service"

    -- Polkit
    hl.exec_cmd "systemctl --user start plasma-polkit-agent.service"

    -- KDE Connect
    hl.exec_cmd "kdeconnectd"
    hl.exec_cmd "kdeconnect-indicator"

    -- Pywalfox
    hl.exec_cmd "pywalfox start"

    -- Bitwarden Firefox extension fullscreen workaround
    hl.exec_cmd "fix-bitwarden"

    -- Walker launcher
    hl.exec_cmd "elephant"
    hl.exec_cmd "walker --gapplication-service"
end)
