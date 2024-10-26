import { show_session } from "libs/variables"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

export const WINDOW_SESSION = "session"

type Item = {
    label: string
    icon: string
    onClicked: () => void
}

// widget representing a power menu item
const SessionMenuItem = (item: Item) =>
    Widget.Button({
        class_name: "session-item",
        onClicked: item.onClicked,
        child: Widget.Box({
            children: [
                Widget.Icon({
                    icon: item.icon,
                    size: 32,
                    css: "margin-right: 12px;",
                }),
                Widget.Label({
                    label: item.label,
                }),
            ],
        }),
    })

// widget showing a list of SessionMenuItems
const SessionMenu = ({ items }) => {
    const list = Widget.Box({
        vertical: true,
        spacing: 12,
    })

    list.children = items.map((item: Item) => SessionMenuItem(item))

    return Widget.Box({
        vertical: true,
        class_name: "session-menu",
        child: list,
    })
}

export const SessionWindow = (monitor: number = 0): Gtk.Window =>
    Widget.Window({
        name: WINDOW_SESSION,
        class_name: "session",
        monitor: monitor,
        anchor: ["top", "right"],
        child: Widget.Box({
            css: "min-width: 2px;min-height: 2px;",
            child: Widget.Revealer({
                revealChild: show_session.bind(),
                transition: "slide_left",
                transitionDuration: 1000,
                child: Widget.Box({
                    vertical: true,
                    css: `margin: 12px;`,
                    children: [
                        Widget.Label({
                            class_name: "session-header",
                            label: "Session Menu",
                        }),
                        SessionMenu({
                            items: [
                                {
                                    label: "Shutdown",
                                    icon: "system-shutdown-symbolic",
                                    onClicked: () => {
                                        Utils.exec("shutdown now")
                                    },
                                },
                                {
                                    label: "Restart",
                                    icon: "system-reboot-symbolic",
                                    onClicked: () => {
                                        Utils.exec("reboot")
                                    },
                                },
                                {
                                    label: "Lock Screen",
                                    icon: "system-lock-screen-symbolic",
                                    onClicked: () => {},
                                },
                                {
                                    label: "Log Out",
                                    icon: "application-exit-symbolic",
                                    onClicked: () => {
                                        Utils.exec("hyprctl dispatchers exit")
                                    },
                                },
                                {
                                    label: "Shutdown in 30minuts",
                                    icon: "preferences-system-time-symbolic",
                                    onClicked: () => {
                                        Utils.exec("shutdown 30")
                                    },
                                },
                            ],
                        }),
                    ],
                }),
            }),
        }),
    })
