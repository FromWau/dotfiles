import { readFile, writeFile } from "ags/file"
import GLib from "gi://GLib"

export interface Config {
    weather?: {
        city: string
        latitude: number
        longitude: number
        timezone: string
    }
}

const CONFIG_PATH = `${GLib.getenv("HOME")}/.config/ags/config.json`

let cachedConfig: Config | null = null

export function readConfig(): Config {
    try {
        const content = readFile(CONFIG_PATH)
        const config = JSON.parse(content)
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
        writeFile(CONFIG_PATH, content)
        cachedConfig = config
        return true
    } catch (err) {
        console.error("[Config] Failed to write config:", err)
        return false
    }
}

