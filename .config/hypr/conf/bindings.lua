-- Keybindings. Mirror of conf/bindings.conf.

local mod = "SUPER"

-- Programs / actions
hl.bind(mod              .. " + RETURN", hl.dsp.exec_cmd("kitty"))
hl.bind("SUPER + SHIFT + RETURN",        hl.dsp.exec_cmd("[float] kitty"))
hl.bind(mod              .. " + Q",      hl.dsp.window.close())
hl.bind("SUPER + SHIFT + L",             hl.dsp.exit())
hl.bind(mod              .. " + F",      hl.dsp.window.fullscreen({ mode = "fullscreen" }))
hl.bind(mod              .. " + G",      hl.dsp.window.fullscreen({ mode = "maximized" }))
hl.bind(mod              .. " + H",      hl.dsp.exec_cmd("ags quit || systemctl --user start ags.service"))
hl.bind(mod              .. " + B",      hl.dsp.exec_cmd("firefox"))
hl.bind(mod              .. " + A",      hl.dsp.exec_cmd("pavucontrol"))
hl.bind("SUPER + SHIFT + A",             hl.dsp.exec_cmd("blueberry"))
hl.bind(mod              .. " + D",      hl.dsp.exec_cmd("hypr-wal"))
hl.bind("SUPER + ALT + D",               hl.dsp.exec_cmd("dunstctl close"))
hl.bind(mod              .. " + V",      hl.dsp.window.float({ action = "toggle" }))
hl.bind(mod              .. " + R",      hl.dsp.exec_cmd("nc -U /run/user/1000/walker/walker.sock"))
hl.bind(mod              .. " + J",      hl.dsp.layout("togglesplit"))
hl.bind(mod              .. " + P",      hl.dsp.exec_cmd("hyprshot --mode region --clipboard-only --freeze --silent"))
hl.bind("SUPER + SHIFT + P",             hl.dsp.exec_cmd("hyprshot --mode region --clipboard-only --freeze --silent; sleep 0.3s && wl-paste | swappy -f -"))
hl.bind("SUPER + SHIFT + Q",             hl.dsp.exec_cmd("qr"))
hl.bind(mod              .. " + TAB",    hl.dsp.window.cycle_next({ next = true }))
hl.bind("SUPER + SHIFT + TAB",           hl.dsp.window.cycle_next({ next = false }))
hl.bind("SUPER + SHIFT + X",             hl.dsp.window.move({ workspace = "special", follow = false }))
hl.bind(mod              .. " + X",      hl.dsp.workspace.toggle_special())

-- SUPER+Y is two dispatchers in hyprlang (setfloating + pin). Wrap in a function.
hl.bind(mod .. " + Y", function()
    hl.dispatch(hl.dsp.window.float({ action = "set" }))
    hl.dispatch(hl.dsp.window.pin())
end)

hl.bind(mod .. " + C", hl.dsp.exec_cmd("hyprpicker | tail -1 | tr -d '\\n' | sed 's/##/0xFF/' | wl-copy"))

-- Brightness (laptop keys; locked so they work on the lock screen, repeating on hold)
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl set 5%-"), { locked = true, repeating = true })
hl.bind("XF86MonBrightnessUp",   hl.dsp.exec_cmd("brightnessctl set 5%+"), { locked = true, repeating = true })

-- Audio (player + sink)
hl.bind("XF86AudioPlay",  hl.dsp.exec_cmd("playerctl play-pause Toggle"), { locked = true })
hl.bind("XF86AudioPause", hl.dsp.exec_cmd("playerctl play-pause Toggle"), { locked = true })
hl.bind("XF86AudioMute",  hl.dsp.exec_cmd("playerctl play-pause Toggle"), { locked = true })

hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+"), { locked = true, repeating = true })
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-"), { locked = true, repeating = true })

hl.bind("XF86AudioNext", hl.dsp.exec_cmd("playerctl next"),     { locked = true })
hl.bind("XF86AudioPrev", hl.dsp.exec_cmd("playerctl previous"), { locked = true })
hl.bind(mod .. " + I",   hl.dsp.exec_cmd("playerctl previous"))
hl.bind(mod .. " + O",   hl.dsp.exec_cmd("playerctl next"))

-- Mouse side buttons for player
hl.bind(mod .. " + mouse:276", hl.dsp.exec_cmd("playerctl next"),     { mouse = true })
hl.bind(mod .. " + mouse:275", hl.dsp.exec_cmd("playerctl previous"), { mouse = true })

-- Scroll wheel adjusts player volume by 0.01
hl.bind(mod .. " + mouse_up",   hl.dsp.exec_cmd("playerctl volume 0.01%+"))
hl.bind(mod .. " + mouse_down", hl.dsp.exec_cmd("playerctl volume 0.01%-"))

-- Focus
hl.bind(mod .. " + left",  hl.dsp.focus({ direction = "left"  }))
hl.bind(mod .. " + right", hl.dsp.focus({ direction = "right" }))
hl.bind(mod .. " + up",    hl.dsp.focus({ direction = "up"    }))
hl.bind(mod .. " + down",  hl.dsp.focus({ direction = "down"  }))

-- Resize (binde: repeat on hold). resize({ x, y, relative? }) — relative for delta.
hl.bind("SUPER + ALT + left",  hl.dsp.window.resize({ x = -15, y = 0,   relative = true }), { repeating = true })
hl.bind("SUPER + ALT + right", hl.dsp.window.resize({ x = 15,  y = 0,   relative = true }), { repeating = true })
hl.bind("SUPER + ALT + up",    hl.dsp.window.resize({ x = 0,   y = -15, relative = true }), { repeating = true })
hl.bind("SUPER + ALT + down",  hl.dsp.window.resize({ x = 0,   y = 15,  relative = true }), { repeating = true })

-- Swap
hl.bind("SUPER + SHIFT + left",  hl.dsp.window.swap({ direction = "left"  }))
hl.bind("SUPER + SHIFT + right", hl.dsp.window.swap({ direction = "right" }))
hl.bind("SUPER + SHIFT + up",    hl.dsp.window.swap({ direction = "up"    }))
hl.bind("SUPER + SHIFT + down",  hl.dsp.window.swap({ direction = "down"  }))

-- Workspaces 1-10 (number key 0 = workspace 10), shift variant moves the active window.
for i = 1, 10 do
    local key = i % 10                                                              -- 10 maps to key 0
    hl.bind(mod              .. " + " .. key, hl.dsp.focus({ workspace = i }))
    hl.bind("SUPER + SHIFT + "          .. key, hl.dsp.window.move({ workspace = i, follow = false }))
end

-- Mouse drag to move/resize
hl.bind(mod .. " + mouse:272", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })
