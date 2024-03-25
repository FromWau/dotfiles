import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js"
import { date, show_media } from "libs/variables.js"
import { NetworkIndicator } from "widgets/network/Network.js"

const Left = () =>
    Widget.Box({
        spacing: 8,
        children: [Workspaces()],
    })

const Workspaces = () =>
    Widget.Box({
        class_name: "workspaces",
        children: Hyprland.bind("workspaces").transform((ws) => {
            return ws.map(({ id }) =>
                Widget.Button({
                    on_clicked: () =>
                        Hyprland.sendMessage(`dispatch workspace ${id}`),
                    child: Widget.Label(`${id === -99 ? "X" : id}`),
                    class_name: Hyprland.active.workspace
                        .bind("id")
                        .transform((i) => `${i === id ? "focused" : ""}`),
                })
            )
        }),
    })

const Center = () =>
    Widget.Box({
        spacing: 8,
        children: [],
    })

const Right = () =>
    Widget.Box({
        hpack: "end",
        spacing: 8,
        children: [AudioMenuToggle(), NetworkIndicator(), Clock()],
    })

const AudioMenuToggle = () =>
    Widget.Button({
        on_clicked: () => show_media.setValue(!show_media.getValue()),
        tooltip_text: "Audio Menu",
        child: Widget.Icon("media-tape-symbolic"),
    })

const Clock = () =>
    Widget.Label({
        class_name: "clock",
        label: date.bind(),
    })

export const Bar = (monitor = 0) =>
    Widget.Window({
        name: `bar-${monitor}`,
        class_name: "bar",
        monitor,
        anchor: ["top", "left", "right"],
        exclusivity: "exclusive",
        child: Widget.CenterBox({
            start_widget: Left(),
            center_widget: Center(),
            end_widget: Right(),
        }),
    })
