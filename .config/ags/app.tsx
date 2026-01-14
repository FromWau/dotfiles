import app from "ags/gtk4/app"
import Bar from "./widget/Bar"
import Settings from "./widget/Settings"
import { For, This, createBinding } from "ags"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { setDisplayMode, cycleDisplayMode, syncDisplayMode, currentDisplayMode, applyDisplayMode } from "./utils/displayMode"
import type { DisplayMode } from "./utils/displayMode"
import { PATHS, validatePaths } from "./utils/paths"
import { readConfig } from "./utils/config"

async function getActiveGpuCount(): Promise<number> {
    try {
        const result = await execAsync([
            "bash",
            "-c",
            "nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l"
        ])
        return parseInt(result.trim()) || 0
    } catch {
        return 0
    }
}

async function buildTheme() {
    const scssPath = PATHS.config.scss
    const cssPath = PATHS.data.css

    try {
        // Validate SCSS file exists
        if (!GLib.file_test(scssPath, GLib.FileTest.EXISTS)) {
            console.error(`SCSS file not found: ${scssPath}`)
            return
        }

        // Build SCSS to CSS (suppress deprecation warnings with --quiet-deps)
        await execAsync(`sass --quiet-deps "${scssPath}" "${cssPath}"`)

        // Validate output was created
        if (!GLib.file_test(cssPath, GLib.FileTest.EXISTS)) {
            console.error("CSS output file not created")
            return
        }

        // Apply CSS
        app.apply_css(cssPath)
        console.log("Theme built successfully")
    } catch (err) {
        console.error("Failed to build theme:", err)
        // Try to apply existing CSS if available
        if (GLib.file_test(cssPath, GLib.FileTest.EXISTS)) {
            console.log("Applying existing CSS file")
            app.apply_css(cssPath)
        }
    }
}

function main() {
    // Validate paths on startup
    const pathErrors = validatePaths()
    if (pathErrors.length > 0) {
        console.error("Path validation failed:")
        pathErrors.forEach((err) => console.error(`  - ${err}`))
    }

    buildTheme()

    // Initialize displayMode from config
    // This runs after Hyprland has started, reads config.json, and applies settings if needed
    const config = readConfig()
    const displayMode = config.displayMode ?? "normal"
    console.log("[App] Display mode from config:", displayMode)
    if (displayMode !== "normal") {
        console.log("[App] Applying display mode to Hyprland...")
        applyDisplayMode(displayMode).catch((err) => {
            console.error("[App] Failed to apply displayMode on startup:", err)
        })
    }

    const monitors = createBinding(app, "monitors")

    // Create Settings window
    Settings()

    return (
        <For each={monitors}>
            {(monitor) => (
                <This this={app}>
                    {Bar(monitor)}
                </This>
            )}
        </For>
    )
}


function requestHandler(argv: string[], response: (response: string) => void) {
    const cmd = argv[0]
    const args = argv.slice(1)
    switch (cmd) {
        case "theme":
            switch (args[0]) {
                case "update":
                    response("OK")
                    buildTheme()
                    break
                default:
                    response("unknown theme arg")
            }
            break

        case "display":
            if (args.length === 0) {
                // Return current display mode from config
                const config = readConfig()
                const mode = config.displayMode ?? "normal"
                response(mode)
            } else if (args[0] === "cycle") {
                // Cycle through modes
                cycleDisplayMode()
                    .then((newMode) => {
                        response(`Display mode: ${newMode}`)
                    })
                    .catch((err) => {
                        console.error("[App] Failed to cycle display mode:", err)
                        response(`Error: ${err}`)
                    })
            } else if (args[0] === "sync") {
                // Sync/reapply current mode from config
                syncDisplayMode()
                    .then(() => {
                        const mode = currentDisplayMode()
                        response(`Display mode synced (${mode})`)
                    })
                    .catch((err) => {
                        console.error("[App] Failed to sync display mode:", err)
                        response(`Error: ${err}`)
                    })
            } else if (args[0] === "normal" || args[0] === "game" || args[0] === "mouse") {
                // Set specific mode
                const mode = args[0] as DisplayMode
                setDisplayMode(mode)
                    .then(async () => {
                        response(`Display mode: ${mode}`)
                        // Auto-open GPU settings when switching to game mode (only if multiple GPUs active)
                        if (mode === "game") {
                            const activeGpus = await getActiveGpuCount()
                            if (activeGpus > 1) {
                                (globalThis as any).showSettings?.(2)
                            }
                        }
                    })
                    .catch((err) => {
                        console.error("[App] Failed to set display mode:", err)
                        response(`Error: ${err}`)
                    })
            } else {
                response("unknown display arg (use: normal, game, mouse, cycle, sync, or no arg to get current mode)")
            }
            break

        default:
            response("unknown cmd")
    }
}

app.start({
    css: PATHS.data.css,
    requestHandler: requestHandler,
    main: main,
})


