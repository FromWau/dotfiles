import { App, Gdk, Gtk } from "astal/gtk3"
import { exec } from "astal/process"
import BarWindow from "./window/bar/Bar"
import PowerWindow from "./window/power/Power"
import MediaWindow from "./window/media/Media"
import RunnerWindow from "./window/runner/Runner"

function main() {
    const bars = new Map<Gdk.Monitor, Gtk.Widget>()

    // initialize
    for (const gdkmonitor of App.get_monitors()) {
        bars.set(gdkmonitor, BarWindow(gdkmonitor))
    }

    App.connect("monitor-added", (_, gdkmonitor) => {
        bars.set(gdkmonitor, BarWindow(gdkmonitor))
    })

    App.connect("monitor-removed", (_, gdkmonitor) => {
        bars.get(gdkmonitor)?.destroy()
        bars.delete(gdkmonitor)
    })

    PowerWindow()
    MediaWindow()
    // RunnerWindow()
}

exec("sass ./scss/main.scss /tmp/ags/style.css")

function rebuild_colors() {
    exec("sass ./scss/main.scss /tmp/ags/style.css")
    App.apply_css("/tmp/ags/style.css")
}

App.start({
    requestHandler(request: string, res: (response: any) => void) {
        switch (request) {
            case "rebuild_colors":
                rebuild_colors()
                res("OK")
                break
            default:
                res("unknown request")
        }
    },
    icons: `${SRC}/icons`,
    css: "/tmp/ags/style.css",
    main,
})
