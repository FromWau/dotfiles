import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { createState } from "gnim"
import { readConfig, updateConfig } from "./config"
import { readFile } from "ags/file"
import "./time"

const CURSOR_SIZE_NORMAL = 24
const CURSOR_SIZE_LARGE = 48

// Create reactive state
const [mouseModeEnabled, setMouseModeEnabled] = createState(false)

// Read initial state from config.json (persistent across reboots)
const config = readConfig()
const initialState = config.mouseMode?.enabled ?? false
console.log("[MouseMode] Initial state from config.json:", initialState)
setMouseModeEnabled(initialState)

export { mouseModeEnabled }

/**
 * Apply mouseMode settings to Hyprland
 * This is called on startup if mouseMode is enabled in config
 */
export async function applyMouseMode(enabled: boolean) {
    console.log("[MouseMode] Step 1: Starting applyMouseMode, enabled=", enabled)

    // Get monitor info from Hyprland
    console.log("[MouseMode] Step 2: Getting monitor info from hyprctl")
    const monitorsJson = await execAsync("hyprctl monitors -j")
    const monitors = JSON.parse(monitorsJson)
    console.log("[MouseMode] Step 3: Found", monitors.length, "monitors")

    for (const monitor of monitors) {
        const name = monitor.name
        console.log("[MouseMode] Step 4: Processing monitor", name)

        // Get default scale from monitors.conf
        let defaultScale = "1.0"
        console.log("[MouseMode] Step 5: Reading monitors.conf")
        try {
            const monitorsConfPath = `${GLib.getenv("HOME")}/.config/hypr/monitors.conf`
            const monitorsConf = readFile(monitorsConfPath)
            const monitorLine = monitorsConf.split("\n").find((line) => line.includes(`monitor=${name}`))
            if (monitorLine) {
                const parts = monitorLine.split(",")
                if (parts.length >= 4) {
                    defaultScale = parts[3].trim()
                }
            }
        } catch (err) {
            console.warn("[MouseMode] Failed to read monitors.conf, using default scale 1.0")
        }

        // Determine scale
        const scale = enabled ? "2.0" : defaultScale
        const resolution = `${monitor.width}x${monitor.height}@${monitor.refreshRate}`
        const position = `${monitor.x}x${monitor.y}`

        // Apply to Hyprland
        const monitorConfig = `${name},${resolution},${position},${scale}`
        console.log("[MouseMode] Step 6: Applying monitor config:", monitorConfig)
        await execAsync(`hyprctl keyword monitor "${monitorConfig}"`)
        console.log("[MouseMode] Step 7: Monitor config applied successfully")
    }

    // Set cursor size
    console.log("[MouseMode] Step 8: Setting cursor size")
    const cursorSize = enabled ? CURSOR_SIZE_LARGE : CURSOR_SIZE_NORMAL
    try {
        await execAsync(`hyprctl setcursor Bibata-Modern-Ice ${cursorSize}`)
        console.log("[MouseMode] Step 9: Cursor size set successfully")
    } catch (err) {
        console.error("[MouseMode] Failed to set cursor size:", err)
    }

    // Restore wallpaper after scaling
    console.log("[MouseMode] Step 10: Restoring wallpaper")
    try {
        await execAsync("swww restore")
        console.log("[MouseMode] Step 11: Wallpaper restored successfully")
    } catch (err) {
        console.warn("[MouseMode] Failed to restore wallpaper:", err)
    }

    console.log("[MouseMode] Step 12: applyMouseMode completed")
}

/**
 * Toggle mouseMode and save state to config
 */
export async function toggleMouseMode() {
    try {
        // Read current state from config (source of truth)
        const config = readConfig()
        const currentState = config.mouseMode?.enabled ?? false
        const newState = !currentState
        console.log("[MouseMode] Toggling from", currentState ? "enabled" : "disabled", "to", newState ? "enabled" : "disabled")

        // Apply the settings
        await applyMouseMode(newState)

        // Save to config.json (persistent across reboots)
        updateConfig({
            mouseMode: {
                enabled: newState,
            },
        })

        // Update reactive state
        setMouseModeEnabled(newState)

        // Send notification
        const title = "Mouse Mode"
        const message = newState ? "Enabled - Comfortable bed browsing mode" : "Disabled - Normal desktop mode"
        execAsync(`notify-send "${title}" "${message}" -i input-mouse`).catch(() => {})

        console.log("[MouseMode] Toggle completed successfully")
        return newState
    } catch (err) {
        console.error("[MouseMode] Error in toggleMouseMode:", err)
        throw err
    }
}

/**
 * Set mouseMode to a specific state
 */
export async function setMouseMode(enabled: boolean) {
    // Read current state from config (source of truth)
    const config = readConfig()
    const currentState = config.mouseMode?.enabled ?? false

    // Only apply if state is different
    if (currentState !== enabled) {
        console.log("[MouseMode] setMouseMode: changing from", currentState ? "enabled" : "disabled", "to", enabled ? "enabled" : "disabled")
        await toggleMouseMode()
    } else {
        console.log("[MouseMode] setMouseMode: already", enabled ? "enabled" : "disabled")
    }
}

/**
 * Re-apply current mouseMode state from config
 * Useful after external changes to Hyprland config
 */
export async function syncMouseMode() {
    const config = readConfig()
    const enabled = config.mouseMode?.enabled ?? false
    console.log("[MouseMode] Syncing from config.json:", enabled ? "enabled" : "disabled")

    await applyMouseMode(enabled)
    setMouseModeEnabled(enabled)
    console.log("[MouseMode] Sync completed")
}
