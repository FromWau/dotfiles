import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { readFile } from "ags/file"
import { createState } from "gnim"

// Read-only access to $XDG_STATE_HOME/hypr/state.json. The canonical writer is
// the `hyprstate` CLI; AGS only mirrors state into a reactive accessor.
export interface State {
    DISPLAY_MODE?: "normal" | "game" | "mouse"
    WALLPAPER?: string
    CURSOR_THEME?: string
    [key: string]: unknown
}

const STATE_PATH = `${GLib.getenv("XDG_STATE_HOME") || `${GLib.getenv("HOME")}/.local/state`}/hypr/state.json`

export function readState(): State {
    try {
        return JSON.parse(readFile(STATE_PATH)) as State
    } catch {
        return {}
    }
}

GLib.mkdir_with_parents(STATE_PATH.replace(/\/[^/]+$/, ""), 0o755)

const [currentState, setCurrentState] = createState<State>(readState())
export { currentState }

// Monitor the parent directory (not the file): atomic temp+rename writes
// invalidate file-level monitors after a single DELETED event. Dir watches
// survive the rename and keep firing for replacement events.
const stateDir = Gio.File.new_for_path(STATE_PATH.replace(/\/[^/]+$/, ""))
const dirMonitor = stateDir.monitor_directory(
    Gio.FileMonitorFlags.WATCH_MOUNTS | Gio.FileMonitorFlags.WATCH_MOVES,
    null,
)
;(globalThis as any).__stateMonitor = dirMonitor // GC root
dirMonitor.connect("changed", (_m, file, otherFile, _event) => {
    const a = file?.get_path()
    const b = otherFile?.get_path?.()
    if (a === STATE_PATH || b === STATE_PATH) {
        setCurrentState(readState())
    }
})
