import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js"
import App from "resource:///com/github/Aylur/ags/app.js"
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import { execAsync } from "resource:///com/github/Aylur/ags/utils.js"
import { Media } from "./widgets/Media.js"

const show_media = Variable(false)

const Bar = (monitor = 0) =>
    Widget.Window({
        name: `bar-${monitor}`, // name has to be unique
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

const Left = () =>
    Widget.Box({
        spacing: 8,
        children: [
            Workspaces(),
            // ClientTitle(),
        ],
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
        children: [audioIndicator, Clock()],
    })

const audioIndicator = Widget.Button({
    on_clicked: () => show_media.setValue(!show_media.getValue()),
    child: Widget.Icon("media-tape-symbolic"),
})

const Clock = () =>
    Widget.Label({
        class_name: "clock",
        setup: (self) =>
            self.poll(1000, (self) =>
                execAsync(["date", "+%T -- %a, %d. %_B(%m) %Y"]).then(
                    (date) => (self.label = date)
                )
            ),
    })

const MediaMenu = (monitor = 0) =>
    Widget.Window({
        name: `mediaMenu-${monitor}`,
        class_name: "revealer",
        monitor,
        anchor: ["top", "left"],
        exclusivity: "exclusive",
        child: Widget.Box({
            css: "padding:1px;",
            child: Widget.Revealer({
                revealChild: show_media.bind(),
                transition: "slide_down",
                transitionDuration: 1000,
                child: Widget.Box({
                    class_name: "media",
                    child: Media(),
                }),
            }),
        }),
    })

App.config({
    style: App.configDir + "/style.css",
    windows: [MediaMenu(), Bar()],
})
