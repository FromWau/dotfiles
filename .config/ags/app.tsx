import app from "ags/gtk4/app"
import Bar from "./widget/Bar"
import { For, This, createBinding } from "ags"
import GLib from "gi://GLib"
import { exec } from "ags/process"

const dataDir = GLib.get_user_data_dir() + "/ags"

function buildTheme() {
    exec(`sass ./scss/main.scss ${dataDir}/style.css`)
    app.apply_css(`${dataDir}/style.css`)
}

function main() {
    buildTheme()

    const monitors = createBinding(app, "monitors")

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
                    break;
                default:
                    response("unknown theme arg")
            }
            break;

        default:
            response("unknown cmd")
    }
}

app.start({
    css: `${dataDir}/style.css`,
    requestHandler: requestHandler,
    main: main,
})


