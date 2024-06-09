import App from "resource:///com/github/Aylur/ags/app.js"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { Bar } from "modules/bar/Bar"
import { MediaMenu } from "modules/audio/Audio"
import { PowerMenuWindow } from "modules/powermenu/PowerMenu"
import { Settings } from "modules/settings/Settings"
import { show_settings } from "libs/variables"
import { reloadScss } from "libs/utils"

const hyprland = await Service.import("hyprland")

// TODO: Test if this is dynamic (plug in another monitor and it gets automatically a bar)
const windows = (): Gtk.Window[] => {
    const wins: Gtk.Window[] = []

    hyprland.monitors.map((monitor) => {
        wins.push(Bar(monitor.id))
    })

    wins.push(MediaMenu(hyprland.active.monitor.id))

    wins.push(PowerMenuWindow(hyprland.active.monitor.id))

    return wins
}

reloadScss()

App.config({
    style: `${App.configDir}/style.css`,
    windows: windows,
})

const RegularWindow = Widget.subclass(Gtk.Window, "RegularWindow")

const createRegWindow = (content: Gtk.Widget) =>
    RegularWindow({
        child: content,
        setup: (self) =>
            self.connect("destroy", () => show_settings.setValue(false)),
    })

var win: Gtk.Window | null = null

show_settings.connect("changed", ({ value }) => {
    if (value) {
        win = createRegWindow(Settings())
        win.show_all()
    } else {
        win?.destroy()
    }
})
