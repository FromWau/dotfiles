-- Environment variables.
-- https://wiki.hypr.land/Configuring/Advanced-and-Cool/Environment-variables/

-- Toolkit Backend Variables
hl.env("GDK_BACKEND", "wayland,x11,*")
hl.env("QT_QPA_PLATFORM", "wayland;xcb")
hl.env("SDL_VIDEODRIVER", "wayland")
hl.env("CLUTTER_BACKEND", "wayland")

-- XDG Specifications
hl.env("XDG_CURRENT_DESKTOP", "Hyprland")
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("XDG_SESSION_DESKTOP", "Hyprland")

-- Qt Variables
hl.env("QT_AUTO_SCREEN_SCALE_FACTOR", "1")
hl.env("QT_WAYLAND_DISABLE_WINDOWDECORATION", "1")
hl.env("QT_QPA_PLATFORMTHEME", "qt5ct")

-- Theming. Cursor theme set dynamically by matugen via hyprctl setcursor.
hl.env("XCURSOR_SIZE", "24")
hl.env("HYPRCURSOR_SIZE", "24")
hl.env("ADW_DISABLE_PORTAL", "1")

-- Electron/CEF: prefer native Wayland to avoid XWayland flicker.
hl.env("ELECTRON_OZONE_PLATFORM_HINT", "auto")

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
