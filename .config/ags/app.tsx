import app from "ags/gtk4/app"
import Bar from "./widget/Bar"
import Settings from "./widget/Settings"
import MonitorSettings from "./widget/MonitorSettings"
import { For, This, createBinding } from "ags"
import GLib from "gi://GLib"
import { exec } from "ags/process"
import { setMouseMode, mouseModeEnabled } from "./utils/mouseMode"

const dataDir = GLib.get_user_data_dir() + "/ags"

function buildTheme() {
    exec(`sass ./scss/main.scss ${dataDir}/style.css`)
    app.apply_css(`${dataDir}/style.css`)
}

function main() {
    buildTheme()

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
                    buildTheme()
                    response("OK")
                    break
                default:
                    response("unknown theme arg")
            }
            break

        case "mousemode":
            if (args.length === 0) {
                // Return current state
                response(mouseModeEnabled.get() ? "true" : "false")
            } else {
                // Set state
                const enabled = args[0] === "true"
                setMouseMode(enabled)
                response(`Mouse mode ${enabled ? "enabled" : "disabled"}`)
            }
            break

        default:
            response("unknown cmd")
    }
}

app.start({
    css: `${dataDir}/style.css`,
    requestHandler: requestHandler,
    main: main,
})


