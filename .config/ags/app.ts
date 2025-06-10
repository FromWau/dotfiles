import { App, Astal, Gdk } from "astal/gtk4"
import Bar from "./widget/bar/Bar"
import { exec, Gio, GLib } from "astal"

const windows = new Map<Gdk.Monitor, Astal.Window[]>()
const dataDir = GLib.get_user_data_dir() + "/ags"

function makeWindowsForMonitor(monitor: Gdk.Monitor) {
    return [Bar(monitor)] as Astal.Window[]
}

function main() {
    for (const monitor of App.get_monitors()) {
        windows.set(monitor, makeWindowsForMonitor(monitor))
    }

    const display = Gdk.Display.get_default()!
    const monitors = display.get_monitors() as Gio.ListModel<Gdk.Monitor>
    monitors.connect(
        "items-changed",
        (monitorModel, position, idxRemoved, idxAdded) => {
            console.log("monitors changed!", position, idxRemoved, idxAdded)

            const prevSet = new Set(windows.keys())
            const currSet = new Set<Gdk.Monitor>()
            let i = 0
            while (true) {
                const monitor = monitorModel.get_item(i) as Gdk.Monitor | null
                i++
                if (monitor) {
                    currSet.add(monitor)
                } else {
                    break
                }
            }

            // Compute removed: monitors in prevSet but not in currSet
            const removed = new Set<Gdk.Monitor>()
            for (const monitor of prevSet) {
                if (!currSet.has(monitor)) {
                    removed.add(monitor)
                }
            }

            // Compute added: monitors in currSet but not in prevSet
            const added = new Set<Gdk.Monitor>()
            for (const monitor of currSet) {
                if (!prevSet.has(monitor)) {
                    added.add(monitor)
                }
            }

            // remove early, before anything else has a chance to break
            for (const monitor of removed) {
                const windowsToRemove = windows.get(monitor) ?? []
                for (const window of windowsToRemove) {
                    window.destroy()
                }
            }

            display.sync()
            console.log(
                "prevSet:",
                Array.from(prevSet).map((mon) => mon.description)
            )
            console.log(
                "currSet:",
                Array.from(currSet).map((mon) => mon.description)
            )
            console.log(
                "removed:",
                Array.from(removed).map((mon) => mon.description)
            )
            console.log(
                "added:",
                Array.from(added).map((mon) => mon.description)
            )

            for (const monitor of added) {
                windows.set(monitor, makeWindowsForMonitor(monitor))
            }
        }
    )

    rebuild_colors()
}

function rebuild_colors() {
    exec(`sass ./scss/main.scss ${dataDir}/style.css`)
    App.apply_css(`${dataDir}/style.css`)
}

function requestHandler(
    request: string,
    response: (response: any) => void
): void {
    switch (request) {
        case "rebuild_colors":
            rebuild_colors()
            response("OK")
            break
        default:
            response("unknown request")
    }
}

App.start({
    icons: `icons`,
    requestHandler: requestHandler,
    css: `${dataDir}/style.css`,
    main: main,
})
