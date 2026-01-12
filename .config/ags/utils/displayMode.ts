import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { createState } from "gnim"
import { readConfig, updateConfig } from "./config"
import { readFile } from "ags/file"
import "./time"

// Display mode types
export type DisplayMode = "normal" | "game" | "mouse"

// Display mode configurations
const DISPLAY_CONFIGS = {
    normal: {
        resolution: null, // Will be read from monitors.conf
        scale: null, // Will be read from monitors.conf
        cursorSize: 24,
        description: "Normal - Max resolution",
    },
    game: {
        resolution: "2560x1440@120",
        scale: "1.0",
        cursorSize: 24,
        description: "Game - 1440p@120Hz",
    },
    mouse: {
        resolution: "1920x1080@120",
        scale: "1.0",
        cursorSize: 48,
        description: "Mouse - 1080p (comfortable browsing)",
    },
} as const

// Create reactive state
const [currentDisplayMode, setCurrentDisplayMode] = createState<DisplayMode>("normal")

// Read initial state from config.json (persistent across reboots)
const config = readConfig()
const initialMode = config.displayMode ?? "normal"
console.log("[DisplayMode] Initial mode from config.json:", initialMode)
setCurrentDisplayMode(initialMode)

export { currentDisplayMode }

/**
 * Apply display mode settings to Hyprland
 */
export async function applyDisplayMode(mode: DisplayMode) {
    console.log("[DisplayMode] Applying mode:", mode)

    const modeConfig = DISPLAY_CONFIGS[mode]

    // Get monitor info from Hyprland
    const monitorsJson = await execAsync("hyprctl monitors -j")
    const monitors = JSON.parse(monitorsJson)
    console.log("[DisplayMode] Found", monitors.length, "monitors")

    for (const monitor of monitors) {
        const name = monitor.name

        // Get default resolution and scale from monitors.conf for "normal" mode
        let defaultResolution = `${monitor.width}x${monitor.height}@${monitor.refreshRate}`
        let defaultScale = "1.0"

        try {
            const monitorsConfPath = `${GLib.getenv("HOME")}/.config/hypr/monitors.conf`
            const monitorsConf = readFile(monitorsConfPath)
            const monitorLine = monitorsConf.split("\n").find((line) => line.includes(`monitor=${name}`))
            if (monitorLine) {
                const parts = monitorLine.split(",")
                if (parts.length >= 2) {
                    defaultResolution = parts[1].trim()
                }
                if (parts.length >= 4) {
                    defaultScale = parts[3].trim()
                }
            }
        } catch (err) {
            console.warn("[DisplayMode] Failed to read monitors.conf, using current resolution")
        }

        // Determine resolution and scale based on mode
        const resolution = modeConfig.resolution ?? defaultResolution
        const scale = modeConfig.scale ?? defaultScale
        const position = `${monitor.x}x${monitor.y}`

        // Apply to Hyprland
        const monitorConfig = `${name},${resolution},${position},${scale}`
        console.log("[DisplayMode] Applying monitor config:", monitorConfig)
        await execAsync(`hyprctl keyword monitor "${monitorConfig}"`)
        console.log("[DisplayMode] Monitor config applied successfully")
    }

    // Set cursor size
    console.log("[DisplayMode] Setting cursor size:", modeConfig.cursorSize)
    try {
        await execAsync(`hyprctl setcursor Bibata-Modern-Ice ${modeConfig.cursorSize}`)
        console.log("[DisplayMode] Cursor size set successfully")
    } catch (err) {
        console.error("[DisplayMode] Failed to set cursor size:", err)
    }

    // Restore wallpaper after resolution change
    console.log("[DisplayMode] Restoring wallpaper")
    try {
        await execAsync("swww restore")
        console.log("[DisplayMode] Wallpaper restored successfully")
    } catch (err) {
        console.warn("[DisplayMode] Failed to restore wallpaper:", err)
    }

    console.log("[DisplayMode] applyDisplayMode completed")
}

/**
 * Set display mode and save to config
 */
export async function setDisplayMode(mode: DisplayMode) {
    try {
        console.log("[DisplayMode] Setting mode to:", mode)

        // Apply the settings
        await applyDisplayMode(mode)

        // Save to config.json (persistent across reboots)
        updateConfig({
            displayMode: mode,
        })

        // Update reactive state
        setCurrentDisplayMode(mode)

        // Send notification
        const modeConfig = DISPLAY_CONFIGS[mode]
        const title = "Display Mode"
        const message = modeConfig.description
        const icon = mode === "game" ? "applications-games" : mode === "mouse" ? "input-mouse" : "video-display"
        execAsync(`notify-send "${title}" "${message}" -i ${icon}`).catch(() => {})

        console.log("[DisplayMode] Mode set successfully")
        return mode
    } catch (err) {
        console.error("[DisplayMode] Error in setDisplayMode:", err)
        throw err
    }
}

/**
 * Cycle through display modes: normal -> game -> mouse -> normal
 */
export async function cycleDisplayMode() {
    const config = readConfig()
    const currentMode = config.displayMode ?? "normal"

    const modes: DisplayMode[] = ["normal", "game", "mouse"]
    const currentIndex = modes.indexOf(currentMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const nextMode = modes[nextIndex]

    console.log("[DisplayMode] Cycling from", currentMode, "to", nextMode)
    return setDisplayMode(nextMode)
}

/**
 * Re-apply current display mode from config
 */
export async function syncDisplayMode() {
    const config = readConfig()
    const mode = config.displayMode ?? "normal"
    console.log("[DisplayMode] Syncing from config.json:", mode)

    await applyDisplayMode(mode)
    setCurrentDisplayMode(mode)
    console.log("[DisplayMode] Sync completed")
}
