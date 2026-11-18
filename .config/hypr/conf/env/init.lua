-- Environment variables.
-- https://wiki.hypr.land/Configuring/Advanced-and-Cool/Environment-variables/

-- Session-wide variables live in ~/.config/environment.d, which every login and every D-Bus app reads; only what
-- depends on this machine at runtime stays here.

hl.on("hyprland.start", function() hl.exec_cmd "gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'" end)

local function has_nvidia_gpu()
    local handle = io.popen "lspci 2>/dev/null"
    if not handle then return false end
    for line in handle:lines() do
        if line:match "VGA" and line:lower():match "nvidia" then
            handle:close()
            return true
        end
    end
    handle:close()
    return false
end

if has_nvidia_gpu() then require "conf.env.nvidia" end
