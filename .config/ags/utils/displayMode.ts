import { execAsync } from "ags/process"
import { currentState } from "./state"
import "./time"

export type DisplayMode = "normal" | "game" | "mouse"

const MODE_META: Record<DisplayMode, { description: string; icon: string }> = {
    normal: { description: "Normal - Max resolution", icon: "video-display" },
    game: { description: "Game - 1440p@120Hz", icon: "applications-games" },
    mouse: { description: "Mouse - 1080p (comfortable browsing)", icon: "input-mouse" },
}

export const currentDisplayMode = currentState.as((s) => (s.DISPLAY_MODE as DisplayMode) ?? "normal")

export async function setDisplayMode(mode: DisplayMode) {
    const { description, icon } = MODE_META[mode]
    await execAsync([
        "hyprstate", "set", "DISPLAY_MODE", mode,
        "--reload",
        "--notify", description,
        "--notify-title", "Display Mode",
        "--notify-icon", icon,
    ])
    return mode
}

export async function cycleDisplayMode() {
    const modes: DisplayMode[] = ["normal", "game", "mouse"]
    const next = modes[(modes.indexOf(currentDisplayMode()) + 1) % modes.length]
    return setDisplayMode(next)
}
