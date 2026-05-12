-- Input devices, keyboard layouts, gestures.

hl.config {
    input = {
        kb_layout = "us,de",
        kb_variant = "",
        kb_model = "",
        kb_options = "grp:win_space_toggle,caps:escape",
        kb_rules = "",
        numlock_by_default = true,
        follow_mouse = 2,
        force_no_accel = true,
        sensitivity = 0,
        touchpad = {
            natural_scroll = true,
        },
    },
}

-- 4-finger swipe left/right cycles workspaces.
hl.gesture { fingers = 4, direction = "horizontal", action = "workspace" }

-- 4-finger swipe down: focus the special workspace (hyprlang: workspace, special).
hl.gesture {
    fingers = 4,
    direction = "down",
    action = function() hl.dispatch(hl.dsp.focus { workspace = "special" }) end,
}

-- 4-finger swipe up: hide the special workspace via helper script.
hl.gesture {
    fingers = 4,
    direction = "up",
    action = function() hl.exec_cmd(os.getenv "HOME" .. "/.config/hypr/scripts/hidespecial.sh") end,
}
