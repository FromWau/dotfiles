-- General layout + dwindle.
local c = require "conf.colors"

hl.config {
    general = {
        gaps_in = 5,
        gaps_out = 20,
        border_size = 2,
        col = {
            active_border = { colors = { c.primary_container, c.secondary_container, c.tertiary_container }, angle = 90 },
            inactive_border = c.background,
        },
        layout = "dwindle",
    },
    dwindle = {
        preserve_split = true,
    },
}
