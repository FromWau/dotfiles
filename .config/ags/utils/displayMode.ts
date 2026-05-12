import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { createState } from "gnim"
import { readConfig, updateConfig } from "./config"
import { writeFile } from "ags/file"

const DISPLAY_MODE_LUA = `${GLib.getenv("HOME")}/.config/hypr/conf/display_mode.lua`
import "./time"

// Display mode types
export type DisplayMode = "normal" | "game" | "mouse"

// Display mode configurations
const DISPLAY_CONFIGS = {
    normal: {
        resolution: null, // monitors.lua wins
        scale: null,
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
 * Parse resolution string like "2560x1440@120" into components
 */
function parseResolution(res: string): { width: number; height: number; refresh: number } | null {
    const match = res.match(/^(\d+)x(\d+)@(\d+(?:\.\d+)?)$/)
    if (!match) return null
    return {
        width: parseInt(match[1]),
        height: parseInt(match[2]),
        refresh: Math.round(parseFloat(match[3])),
    }
}

/**
 * Check if monitor already matches target settings
 */
function monitorMatchesTarget(
    monitor: { width: number; height: number; refreshRate: number; scale: number },
    targetResolution: string,
    targetScale: string,
): boolean {
    const target = parseResolution(targetResolution)
    if (!target) return false

    const scaleMatches = Math.abs(monitor.scale - parseFloat(targetScale)) < 0.01
    const resMatches =
        monitor.width === target.width &&
        monitor.height === target.height &&
        Math.round(monitor.refreshRate) === target.refresh

    return scaleMatches && resMatches
}

/**
 * Apply display mode settings to Hyprland by rewriting display_mode.lua
 * and reloading. For "normal" the file becomes a no-op placeholder and
 * monitors.lua wins. For other modes the file holds hl.monitor() overrides.
 */
export async function applyDisplayMode(mode: DisplayMode) {
    console.log("[DisplayMode] Applying mode:", mode)

    const modeConfig = DISPLAY_CONFIGS[mode]
    let luaContent: string
    let needsReload = false

    if (mode === "normal") {
        luaContent =
            "-- Managed by AGS at runtime. Current mode: normal. No overrides; monitors.lua wins.\n"
        // We don't know whether prior overrides exist without re-reading the
        // file. Always reload on entering normal mode to revert cleanly.
        needsReload = true
    } else {
        const monitorsJson = await execAsync("hyprctl monitors -j")
        const monitors = JSON.parse(monitorsJson)
        console.log("[DisplayMode] Found", monitors.length, "monitors")

        const lines: string[] = []
        const resolution = modeConfig.resolution!
        const scale = modeConfig.scale!

        for (const monitor of monitors) {
            const name = monitor.name
            const position = `${monitor.x}x${monitor.y}`
            lines.push(
                `hl.monitor({ output = "${name}", mode = "${resolution}", position = "${position}", scale = "${scale}" })`,
            )
            if (!monitorMatchesTarget(monitor, resolution, scale)) {
                needsReload = true
            }
        }
        luaContent = `-- Managed by AGS at runtime. Current mode: ${mode}.\n${lines.join("\n")}\n`
    }

    writeFile(DISPLAY_MODE_LUA, luaContent)
    console.log("[DisplayMode] Written to", DISPLAY_MODE_LUA)

    if (needsReload) {
        console.log("[DisplayMode] Reloading Hyprland config")
        await execAsync("hyprctl reload")
    } else {
        console.log("[DisplayMode] All monitors already match, skipping reload")
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
        await execAsync("awww restore")
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
