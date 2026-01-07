import { readFile, writeFile } from "ags/file"
import GLib from "gi://GLib"

export interface Config {
    weather?: {
        city: string
        latitude: number
        longitude: number
        timezone: string
    }
    theme?: {
        currentWallpaper: string
        cursorTheme: string
    }
    mouseMode?: {
        enabled: boolean
    }
}

const CONFIG_PATH = `${GLib.getenv("HOME")}/.config/ags/config.json`

let cachedConfig: Config | null = null

export function readConfig(): Config {
    // Always read from disk to avoid stale cache
    try {
        const content = readFile(CONFIG_PATH)
        const config = JSON.parse(content)
        cachedConfig = config
        return config || {}
    } catch (err) {
        console.error("[Config] Failed to read config:", err)
        return cachedConfig || {}
    }
}

export function writeConfig(config: Config): boolean {
    try {
        const content = JSON.stringify(config, null, "\t")
        console.log("[Config] Writing to:", CONFIG_PATH)
        console.log("[Config] Content:", content)
        writeFile(CONFIG_PATH, content)  // Correct order: path, content
        cachedConfig = config
        console.log("[Config] Config saved successfully")

        // Verify write
        const readBack = readFile(CONFIG_PATH)
        console.log("[Config] Read back:", readBack.substring(0, 100) + "...")

        return true
    } catch (err) {
        console.error("[Config] Failed to write config:", err)
        return false
    }
}

export function updateConfig(updates: Partial<Config>): boolean {
    try {
        const currentConfig = readConfig()
        console.log("[Config] Current config:", JSON.stringify(currentConfig))
        console.log("[Config] Updates:", JSON.stringify(updates))

        // Deep merge to preserve nested properties
        const newConfig: Config = {
            weather: { ...(currentConfig.weather || {}), ...(updates.weather || {}) },
            theme: { ...(currentConfig.theme || {}), ...(updates.theme || {}) },
            mouseMode: { ...(currentConfig.mouseMode || {}), ...(updates.mouseMode || {}) },
        }
        console.log("[Config] New config:", JSON.stringify(newConfig))

        const result = writeConfig(newConfig)
        console.log("[Config] Write result:", result)
        return result
    } catch (err) {
        console.error("[Config] Error in updateConfig:", err)
        return false
    }
}
