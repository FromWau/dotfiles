-- Merges the two monitor inputs into a single hl.monitor call per output:
-- monitors.lua (written by nwg-displays) owns geometry — position, scale, vrr
-- — while DISPLAY_MODE from state.json owns the resolution override and the
-- cursor size. Splitting them back into two calls would let whichever loads
-- last silently overwrite the other.

local function shell(cmd)
    local handle = io.popen(cmd .. " 2>/dev/null")
    if not handle then return nil end
    local out = handle:read "*l"
    handle:close()
    if out == nil or out == "" then return nil end
    return out
end

local function read_state(key)
    local xdg_state = os.getenv "XDG_STATE_HOME" or (os.getenv "HOME" .. "/.local/state")
    local path = xdg_state .. "/hypr/state.json"
    return shell(string.format("jq -r '.%s // empty' %q", key, path))
end

local function gsettings_cursor_theme()
    local out = shell "gsettings get org.gnome.desktop.interface cursor-theme"
    if not out then return nil end
    return out:match "^'(.*)'$" or out
end

-- require, not loadfile: Hyprland registers its config-file watch from its own
-- module loader, so a loadfile'd monitors.lua stops triggering an autoreload
-- when nwg-displays rewrites it.
local function nwg_rules()
    local rules = {}
    local apply = hl.monitor
    hl.monitor = function(rule) rules[#rules + 1] = rule end

    local ok, err = pcall(require, "monitors")
    hl.monitor = apply

    if not ok then
        io.stderr:write("conf.monitors: monitors.lua failed: " .. tostring(err) .. "\n")
        return {}
    end
    return rules
end

-- `normal` declares no overrides: it means "whatever nwg-displays wrote".
-- Adding scale or position here would take ownership back from nwg-displays.
local modes = {
    normal = { cursor = 24 },
    game = { cursor = 24, outputs = { ["HDMI-A-2"] = { mode = "2560x1440@120" } } },
    mouse = { cursor = 48, outputs = { ["HDMI-A-2"] = { mode = "1920x1080@120" } } },
}

local mode = modes[read_state "DISPLAY_MODE"] or modes.normal
local overrides = mode.outputs or {}

for _, rule in ipairs(nwg_rules()) do
    for key, value in pairs(overrides[rule.output] or {}) do
        rule[key] = value
    end
    hl.monitor(rule)
end

local cursor_theme = read_state "CURSOR_THEME" or gsettings_cursor_theme()
if cursor_theme then
    hl.exec_cmd("hyprctl setcursor " .. cursor_theme .. " " .. mode.cursor)
end

hl.exec_cmd "awww restore"
