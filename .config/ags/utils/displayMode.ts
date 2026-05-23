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

async function getActiveGpuCount(): Promise<number> {
    try {
        const result = await execAsync([
            "bash", "-c",
            "timeout 2 nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l",
        ])
        return parseInt(result.trim()) || 0
    } catch {
        return 0
    }
}

export async function setDisplayMode(mode: DisplayMode) {
    const { description, icon } = MODE_META[mode]
    await execAsync([
        "hyprstate", "set", "DISPLAY_MODE", mode,
        "--reload",
        "--notify", description,
        "--notify-title", "Display Mode",
        "--notify-icon", icon,
    ])
    if (mode === "game" && (await getActiveGpuCount()) > 1) {
        (globalThis as any).showSettings?.(2)
    }
    return mode
}

export async function cycleDisplayMode() {
    const modes: DisplayMode[] = ["normal", "game", "mouse"]
    const next = modes[(modes.indexOf(currentDisplayMode()) + 1) % modes.length]
    return setDisplayMode(next)
}
