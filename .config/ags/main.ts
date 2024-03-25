import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js"
import App from "resource:///com/github/Aylur/ags/app.js"
import { Bar } from "widgets/bar/Bar.js"
import { MediaMenu } from "widgets/audio/Audio.js"

const Windows = () => {
    var wins = []
    wins.push(
        MediaMenu(Hyprland.active.workspace.bind("id").transform((i) => i - 1))
    )

    Hyprland.monitors.forEach((monitor) => {
        // INFO: This is not dynamic, use bind if we want to make it dynamic
        wins.push(Bar(monitor.id))
    })

    // wins.push(Bar(Hyprland.active.workspace.bind("id").transform((i) => i - 1)))

    return wins
}

App.config({
    style: App.configDir + "/style.css",
    windows: Windows(),
})
