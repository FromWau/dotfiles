import App from "resource:///com/github/Aylur/ags/app.js"
import { BarWindow, Bar } from "modules/bar/Bar"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { formatNumber, reloadScss } from "libs/utils"
import { MediaWindow } from "modules/media/Media"
import { SessionWindow } from "modules/session/Session"
import "modules/api/Api"
import { show_session } from "libs/variables"

const hyprland = await Service.import("hyprland")

const show_test = Variable(false)

const TestWindow = (): Gtk.Window =>
    Widget.Window({
        name: "test",
        monitor: 0,
        anchor: ["left", "top", "right"],
        exclusivity: "exclusive",
        child: Widget.Box({
            child: Widget.EventBox({
                vexpand: true,
                hexpand: true,
                onHover: () => show_test.setValue(false),
                child: Widget.EventBox({
                    margin_bottom: 20,
                    vexpand: true,
                    hexpand: true,
                    onHover: () => show_test.setValue(true),
                    child: Widget.Box({
                        css: "min-height: 10px;",
                        child: Widget.Revealer({
                            revealChild: show_test.bind(),
                            transition: "slide_down",
                            transitionDuration: 1000,
                            child: Bar(),
                        }),
                    }),
                }),
            }),
        }),
    })

// TODO: Test if this is dynamic (plug in another monitor and it gets automatically a bar)
const windows = (): Gtk.Window[] => {
    const wins: Gtk.Window[] = []

    hyprland.monitors.map((monitor) => wins.push(BarWindow(monitor.id)))
    // wins.push(TestWindow())

    wins.push(MediaWindow(hyprland.active.monitor.id))

    wins.push(SessionWindow(hyprland.active.monitor.id))


    return wins
}

reloadScss()

App.config({
    style: `${App.configDir}/style.css`,
    windows: windows,
})

