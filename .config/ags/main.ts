import App from "resource:///com/github/Aylur/ags/app.js"
import { Bar } from "modules/bar/Bar"
import { MediaMenu } from "modules/audio/Audio"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { reloadScss } from "libs/utils"
import { SessionWindow } from "modules/session/Session"

const hyprland = await Service.import("hyprland")

// TODO: Test if this is dynamic (plug in another monitor and it gets automatically a bar)
const windows = (): Gtk.Window[] => {
    const wins: Gtk.Window[] = []

    hyprland.monitors.map((monitor) => {
        wins.push(Bar(monitor.id))
    })

    wins.push(MediaMenu(hyprland.active.monitor.id))

    wins.push(SessionWindow(hyprland.active.monitor.id))

    return wins
}

reloadScss()

App.config({
    style: `${App.configDir}/style.css`,
    windows: windows,
})
