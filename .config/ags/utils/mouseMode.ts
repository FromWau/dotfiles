import { readFile, writeFile } from "ags/file"
import GLib from "gi://GLib"
import { createPoll } from "ags/time"
import "./../utils/time"

const statePath = GLib.get_user_data_dir() + "/ags/mouse-mode.json"

interface MouseModeState {
    enabled: boolean
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

// Use createPoll to check state periodically (updates every 100ms)
export const mouseModeEnabled = createPoll(loadState(), (100).milliseconds, () => loadState())

export function toggleMouseMode() {
    const newState = !loadState()
    saveState(newState)
    return newState
}

export function setMouseMode(enabled: boolean) {
    saveState(enabled)
}
