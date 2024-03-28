import App from "resource:///com/github/Aylur/ags/app.js"
import { Bar } from "widgets/bar/Bar"
import { MediaMenu } from "widgets/audio/Audio"
import { forActiveWorkspace, forMonitors } from "libs/utils"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

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
    // windows: () => [
    //     ...forMonitors((monitor_id: number) => Bar(monitor_id)),
    //     forActiveWorkspace((workspace_id: number) => {
    //         console.log("Workspace ID: " + workspace_id)
    //         return MediaMenu(workspace_id)
    //     }),
    // ],
    windows: windows,
})
