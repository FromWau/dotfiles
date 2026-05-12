-- Hyprland Lua config entry. Migrated from hyprland.conf on 2026-05-12.
-- Old .conf files kept on disk as backups; not read while this file exists.
-- Hyprland decides between hyprland.lua and hyprland.conf once at startup.

local config_dir = os.getenv("HOME") .. "/.config/hypr"
package.path = config_dir .. "/?.lua;"
            .. config_dir .. "/?/init.lua;"
            .. package.path

-- Load order matters: env first so vars are set before anything reads them;
-- colors before decoration/layouts that consume it; startup last.
require("conf.env")
require("conf.colors")            -- returns a table; loaded for side-effect of caching
-- monitors.lua / workspaces.lua are committed as empty placeholders and
-- gitignored for local edits (per-device).
require("monitors")
require("workspaces")
require("conf.io")
require("conf.display_mode")
require("conf.layouts")
require("conf.rules")
require("conf.decoration")
require("conf.animations")
require("conf.bindings")
require("conf.per_device")
require("conf.misc")
require("conf.startup")
