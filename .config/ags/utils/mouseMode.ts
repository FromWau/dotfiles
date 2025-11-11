import { readFile, writeFile } from "ags/file"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { createState } from "gnim"
import "./../utils/time"

const statePath = GLib.get_user_data_dir() + "/ags/mouse-mode.json"
const CURSOR_SIZE_NORMAL = 24
const CURSOR_SIZE_LARGE = 48
const TARGET_HEIGHT = 1080 // Target resolution height for mouse mode

interface MouseModeState {
    enabled: boolean
}

interface MonitorInfo {
    name: string
    width: number
    height: number
    refreshRate: number
    x: number
    y: number
}

function loadState(): boolean {
    try {
        const data = readFile(statePath)
        const state: MouseModeState = JSON.parse(data)
        return state.enabled ?? false
    } catch {
        return false
    }
}

function saveState(enabled: boolean) {
    try {
        const state: MouseModeState = { enabled }
        writeFile(statePath, JSON.stringify(state))
    } catch (err) {
        console.error("Failed to save mouse mode state:", err)
    }
}

function roundToQuarter(num: number): number {
    // Round to nearest 0.25 (Hyprland requirement)
    return Math.round(num * 4) / 4
}

async function getMonitors(): Promise<MonitorInfo[]> {
    try {
        const output = await execAsync("hyprctl monitors -j")
        const monitors = JSON.parse(output)
        return monitors.map((m: any) => ({
            name: m.name,
            width: m.width,
            height: m.height,
            refreshRate: m.refreshRate,
            x: m.x,
            y: m.y,
        }))
    } catch (err) {
        console.error("Failed to get monitors:", err)
        return []
    }
}

function getDefaultScale(monitorName: string): number {
    try {
        const configPath = `${GLib.getenv("HOME")}/.config/hypr/conf/io/monitor.conf`
        const content = readFile(configPath)
        const lines = content.split("\n")

        for (const line of lines) {
            if (line.includes(`monitor=${monitorName}`)) {
                const parts = line.split(",")
                if (parts.length >= 4) {
                    const scale = parseFloat(parts[3].trim())
                    return isNaN(scale) ? 1 : scale
                }
            }
        }
    } catch (err) {
        console.error("Failed to read default scale:", err)
    }
    return 1
}

function getExtraMonitorSettings(monitorName: string): string {
    try {
        const configPath = `${GLib.getenv("HOME")}/.config/hypr/conf/io/monitor.conf`
        const content = readFile(configPath)
        const lines = content.split("\n")

        for (const line of lines) {
            if (line.includes(`monitor=${monitorName}`)) {
                const parts = line.split(",")
                if (parts.length >= 5) {
                    return parts.slice(4).join(",").trim()
                }
            }
        }
    } catch (err) {
        console.error("Failed to read extra settings:", err)
    }
    return ""
}

async function applyMouseMode(enabled: boolean) {
    const monitors = await getMonitors()
    if (monitors.length === 0) {
        console.error("No monitors found")
        return
    }

    const lines = ["# Auto generated - Mouse Mode"]

    for (const monitor of monitors) {
        const defaultScale = getDefaultScale(monitor.name)
        let scale: number

        if (enabled) {
            // Calculate scale to get to target height (1080p)
            const calculatedScale = monitor.height / TARGET_HEIGHT
            scale = roundToQuarter(calculatedScale)
            console.log(
                `Mouse mode: scaling ${monitor.name} from ${monitor.height}p to ${TARGET_HEIGHT}p (scale: ${scale})`
            )
        } else {
            scale = defaultScale
        }

        const resolution = `${monitor.width}x${monitor.height}@${monitor.refreshRate}`
        const position = `${monitor.x}x${monitor.y}`
        const extraSettings = getExtraMonitorSettings(monitor.name)

        if (extraSettings) {
            lines.push(`monitor=${monitor.name}, ${resolution}, ${position}, ${scale}, ${extraSettings}`)
        } else {
            lines.push(`monitor=${monitor.name}, ${resolution}, ${position}, ${scale}`)
        }
    }

    // Write monitor config to Hyprland temp file
    const content = lines.join("\n")
    const configPath = `${GLib.getenv("HOME")}/.config/hypr/conf/temp/monitor_scale.conf`

    try {
        // Use the update_file.sh script to write config
        const scriptPath = `${GLib.getenv("HOME")}/.config/hypr/scripts/utils/update_file.sh`
        await execAsync(`bash "${scriptPath}" "temp/monitor_scale.conf" "${content.replace(/"/g, '\\"')}"`)
    } catch (err) {
        console.error("Failed to write monitor config:", err)
    }

    // Update cursor size
    const cursorSize = enabled ? CURSOR_SIZE_LARGE : CURSOR_SIZE_NORMAL
    try {
        await execAsync(`hyprctl setcursor Bibata-Modern-Ice ${cursorSize}`)
    } catch (err) {
        console.error("Failed to set cursor size:", err)
    }

    // Restore wallpaper to fix any rendering issues
    execAsync("swww restore").catch(() => {
        // Ignore errors if swww is not running
    })

    // Send notification
    const title = "Mouse Mode"
    const message = enabled ? "Enabled - Comfortable bed browsing mode" : "Disabled - Normal desktop mode"
    execAsync(`notify-send "${title}" "${message}" -i input-mouse`).catch(() => {
        // Ignore notification errors
    })
}

// Load initial state from disk once on startup
const initialState = loadState()
const [mouseModeEnabled, setMouseModeEnabledInternal] = createState(initialState)
export { mouseModeEnabled }

export function toggleMouseMode() {
    const newState = !mouseModeEnabled()
    setMouseModeEnabledInternal(newState)
    saveState(newState)
    applyMouseMode(newState)
    return newState
}

export function setMouseMode(enabled: boolean) {
    setMouseModeEnabledInternal(enabled)
    saveState(enabled)
    applyMouseMode(enabled)
}

export function syncMouseMode() {
    // Reapply current state (useful on AGS/Hyprland startup)
    const currentState = loadState()
    applyMouseMode(currentState)
}
