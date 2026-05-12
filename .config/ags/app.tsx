import app from "ags/gtk4/app"
import Bar from "./widget/Bar"
import Settings from "./widget/Settings"
import { For, This, createBinding } from "ags"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { PATHS, validatePaths } from "./utils/paths"

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

        default:
            response("unknown cmd")
    }
}

app.start({
    css: PATHS.data.css,
    requestHandler: requestHandler,
    main: main,
})


