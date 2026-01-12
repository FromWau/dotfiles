import { readFile, writeFile } from "ags/file"
import GLib from "gi://GLib"

export type DisplayMode = "normal" | "game" | "mouse"

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
    displayMode?: DisplayMode
}

const CONFIG_PATH = `${GLib.getenv("HOME")}/.config/ags/config.json`

let cachedConfig: Config | null = null

/**
 * Migrate legacy mouseMode/gameMode to displayMode
 */
function migrateConfig(config: any): Config {
    // Check if we have legacy fields
    const hasLegacyFields = config.mouseMode !== undefined || config.gameMode !== undefined

    if (hasLegacyFields) {
        // Migrate from legacy fields if no displayMode set
        let displayMode: DisplayMode = config.displayMode ?? "normal"

        if (!config.displayMode) {
            if (config.mouseMode?.enabled) {
                displayMode = "mouse"
            } else if (config.gameMode?.enabled) {
                displayMode = "game"
            }
        }

        console.log("[Config] Migrating legacy config to displayMode:", displayMode)
        const migratedConfig: Config = {
            weather: config.weather,
            theme: config.theme,
            displayMode,
        }

        // Save migrated config
        writeConfig(migratedConfig)
        return migratedConfig
    }

    return config
}

export function readConfig(): Config {
    // Always read from disk to avoid stale cache
    try {
        const content = readFile(CONFIG_PATH)
        let config = JSON.parse(content)
        // Migrate legacy config if needed
        config = migrateConfig(config || {})
        cachedConfig = config
        return config
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
            ...currentConfig,
            ...updates,
            weather: { ...(currentConfig.weather || {}), ...(updates.weather || {}) },
            theme: { ...(currentConfig.theme || {}), ...(updates.theme || {}) },
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
