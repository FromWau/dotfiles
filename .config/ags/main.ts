import App from "resource:///com/github/Aylur/ags/app.js"
import { BarWindow } from "modules/bar/Bar"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { reloadScss } from "libs/utils"
import { MediaWindow } from "modules/media/Media"
import { SessionWindow } from "modules/session/Session"
import "modules/api/Api"
import { RunnerWindow } from "modules/runner/Runner"
import { show_runner } from "libs/variables"
import { loadUserData } from "libs/loadUserData"

const hyprland = await Service.import("hyprland")

// TODO: Test if this is dynamic (plug in another monitor and it gets automatically a bar)
const windows = (): Gtk.Window[] => {
    const wins: Gtk.Window[] = []

    hyprland.monitors.map((monitor) => wins.push(BarWindow(monitor.id)))

    wins.push(MediaWindow(hyprland.active.monitor.id))

    wins.push(SessionWindow(hyprland.active.monitor.id))

    const runner = RunnerWindow(hyprland.active.monitor.id)
    runner.hook(show_runner, (self) => {
        if (show_runner.getValue()) {
            self.show()
        } else {
            self.hide()
        }
    })

    wins.push(runner)

    return wins
}

reloadScss()

loadUserData()

App.config({
    style: `${App.configDir}/style.css`,
    windows: windows,
})
