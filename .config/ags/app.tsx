import app from "ags/gtk4/app"
import Bar from "./widget/Bar"
import Settings from "./widget/Settings"
import MonitorSettings from "./widget/MonitorSettings"
import { For, This, createBinding } from "ags"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { setMouseMode, toggleMouseMode, syncMouseMode, mouseModeEnabled, applyMouseMode } from "./utils/mouseMode"
import { PATHS, validatePaths } from "./utils/paths"
import { readConfig } from "./utils/config"

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

    // Initialize mouseMode from config
    // This runs after Hyprland has started, reads config.json, and applies settings if needed
    const config = readConfig()
    const mouseModeConfig = config.mouseMode?.enabled ?? false
    if (mouseModeConfig) {
        console.log("[App] MouseMode enabled in config, applying settings to Hyprland...")
        applyMouseMode(true).catch((err) => {
            console.error("[App] Failed to apply mouseMode on startup:", err)
        })
    } else {
        console.log("[App] MouseMode disabled in config")
    }

    const monitors = createBinding(app, "monitors")

    // Create Settings window
    Settings()
    MonitorSettings()

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

        case "mousemode":
            if (args.length === 0) {
                // Return current state from config
                const config = readConfig()
                const enabled = config.mouseMode?.enabled ?? false
                response(enabled ? "true" : "false")
            } else if (args[0] === "toggle") {
                // Toggle mouse mode
                toggleMouseMode()
                    .then((newState) => {
                        response(`Mouse mode ${newState ? "enabled" : "disabled"}`)
                    })
                    .catch((err) => {
                        console.error("[App] Failed to toggle mouse mode:", err)
                        response(`Error: ${err}`)
                    })
            } else if (args[0] === "sync") {
                // Sync/reapply current state from config
                syncMouseMode()
                    .then(() => {
                        const currentState = mouseModeEnabled()
                        response(`Mouse mode synced (${currentState ? "enabled" : "disabled"})`)
                    })
                    .catch((err) => {
                        console.error("[App] Failed to sync mouse mode:", err)
                        response(`Error: ${err}`)
                    })
            } else if (args[0] === "true" || args[0] === "false") {
                // Set state explicitly
                const enabled = args[0] === "true"
                setMouseMode(enabled)
                    .then(() => {
                        response(`Mouse mode ${enabled ? "enabled" : "disabled"}`)
                    })
                    .catch((err) => {
                        console.error("[App] Failed to set mouse mode:", err)
                        response(`Error: ${err}`)
                    })
            } else {
                response("unknown mousemode arg (use: toggle, sync, true, false, or no arg to get state)")
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


