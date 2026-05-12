-- Hyprland Lua config entry. Migrated from hyprland.conf on 2026-05-12.
-- Old .conf files kept on disk as backups; not read while this file exists.
-- Hyprland decides between hyprland.lua and hyprland.conf once at startup.

local config_dir = os.getenv "HOME" .. "/.config/hypr"
package.path = config_dir .. "/?.lua;" .. config_dir .. "/?/init.lua;" .. package.path

require "conf"
