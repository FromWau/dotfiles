import App from "resource:///com/github/Aylur/ags/app.js"
import { Bar } from "widgets/bar/Bar"
import { MediaMenu } from "widgets/audio/Audio"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { show_settings } from "libs/variables"

const hyprland = await Service.import("hyprland")

// TODO: Test if this is dynamic (plug in another monitor and it gets automatically a bar)
const windows = (): Gtk.Window[] => {
    const wins: Gtk.Window[] = []

    hyprland.monitors.map((monitor) => {
        wins.push(Bar(monitor.id))
    })

    wins.push(MediaMenu(hyprland.active.monitor.id))

    return wins
}

App.config({
    style: App.configDir + "/style.scss",
    windows: windows,
})

const RegularWindow = Widget.subclass(Gtk.Window, "RegularWindow")

const createRegWindow = () => {
    const x = RegularWindow(Widget.Box(Widget.Label("Hello, World!")))
    x.connect("destroy", () => show_settings.setValue(false))

    return x
}

var win: Gtk.Window | null = null

show_settings.connect("changed", ({ value }) => {
    if (value) {
        win = createRegWindow()
        win.show_all()
    } else {
        win?.destroy()
    }
})
