import { App, Gdk, Gtk } from "astal/gtk3"
import { exec } from "astal/process"
import Bar from "./widget/bar/Bar"
import Power from "./widget/power/Power"

function main() {
    const bars = new Map<Gdk.Monitor, Gtk.Widget>()

    // initialize
    for (const gdkmonitor of App.get_monitors()) {
        bars.set(gdkmonitor, Bar(gdkmonitor))
    }

    App.connect("monitor-added", (_, gdkmonitor) => {
        bars.set(gdkmonitor, Bar(gdkmonitor))
    })

    App.connect("monitor-removed", (_, gdkmonitor) => {
        bars.get(gdkmonitor)?.destroy()
        bars.delete(gdkmonitor)
    })

    Power()
}

exec("sass ./scss/main.scss /tmp/ags/style.css")

function rebuild_colors() {
    exec("sass ./scss/main.scss /tmp/ags/style.css")
    App.apply_css("/tmp/ags/style.css")
}

App.start({
    requestHandler(request: string, res: (response: any) => void) {
        if (request == "rebuild_colors") {
            rebuild_colors()
        } else {
            res("unknown request")
        }
    },
    css: "/tmp/ags/style.css",
    main,
})
