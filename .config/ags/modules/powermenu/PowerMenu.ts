import { show_power_menu } from "libs/variables"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

const WINDOW_NAME = "powermenu"

type Item = {
    label: string
    icon: string
    onClicked: () => void
}

// widget representing a power menu item
const PowerMenuItem = (item: Item) =>
    Widget.Button({
        className: "powermenuButtons",
        onClicked: item.onClicked,
        child: Widget.Box({
            children: [
                Widget.Icon({
                    className: "powermenuIcons",
                    icon: item.icon,
                    size: 42,
                }),
                Widget.Label({
                    label: item.label,
                    className: "smalltitle",
                }),
            ],
        }),
    })

// widget showing a list of PowerMenuItems
const PowerMenu = ({ items }) => {
    const list = Widget.Box({
        vertical: true,
        spacing: 12,
    })

    list.children = items.map((item: Item) => PowerMenuItem(item))

    return Widget.Box({
        vertical: true,
        css: `margin: 12px;`,
        child: list,
    })
}

export const PowerMenuWindow = (monitor: number = 0): Gtk.Window =>
    Widget.Window({
        name: WINDOW_NAME,
        class_name: "powermenuwindow",
        monitor: monitor,
        anchor: ["top", "right"],
        child: Widget.Box({
            css: "min-width: 2px;min-height: 2px;",
            child: Widget.Revealer({
                revealChild: show_power_menu.bind(),
                transition: "slide_left",
                transitionDuration: 1000,
                child: Widget.Box({
                    vertical: true,
                    children: [
                        Widget.Label({
                            class_name: "powermenu-title",
                            label: "Power Menu",
                        }),
                        PowerMenu({
                            items: [
                                {
                                    label: "Shutdown",
                                    icon: "system-shutdown-symbolic",
                                    onClicked: () => {},
                                },
                                {
                                    label: "Restart",
                                    icon: "system-reboot-symbolic",
                                    onClicked: () => {},
                                },
                                {
                                    label: "Lock Screen",
                                    icon: "system-lock-screen-symbolic",
                                    onClicked: () => {},
                                },
                                {
                                    label: "Log Out",
                                    icon: "application-exit-symbolic",
                                    onClicked: () => {},
                                },
                                {
                                    label: "Sleep in 30minuts",
                                    icon: "preferences-system-time-symbolic",
                                    onClicked: () => {},
                                },
                            ],
                        }),
                    ],
                }),
            }),
        }),
    })
