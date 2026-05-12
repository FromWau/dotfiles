-- Window decoration.
local c = require "conf.colors"

hl.config {
    decoration = {
        rounding = 10,
        blur = {
            enabled = false,
            size = 3,
            passes = 1,
            ignore_opacity = true,
            new_optimizations = true,
        },
        shadow = {
            enabled = true,
            render_power = 3,
            color = c.shadow,
            color_inactive = c.background,
        },
    },
}
