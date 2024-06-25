import {
    date,
    show_media,
    show_settings,
    show_power_menu,
    CpuProgress,
    RamProgress,
    ramPercentage,
    ramUsage,
    cpuUsage,
    currentKeymap,
} from "libs/variables"
import { NetworkIndicator } from "./widgets/network/Network"
import { BluetoothIndicator } from "./widgets/bluetooth/Bluetooth"
import { Battery } from "./widgets/battery/Battery"
import { Systemtray } from "./widgets/systemtray/Systemtray"

const hyprland = await Service.import("hyprland")

// const RightSlant = () =>
//     Widget.DrawingArea({
//         class_name: "slant",
//         widthRequest: 50,
//         heightRequest: 50,
//         drawFn: (_self, cr, w, h) => {
//             cr.setSourceRGBA(1, 1, 1, 1)
//             cr.moveTo(0, 0)
//             cr.lineTo(0, w)
//             cr.moveTo(0, 0)
//             cr.lineTo(0, h)
//             cr.curveTo(0, h, Math.sqrt(w, 2), Math.sqrt(h, 2), w, 0)
//             cr.fill()
//         },
//     })

const Left = () =>
    Widget.Box({
        class_name: "left",
        children: [Workspaces()],
    })

const Workspaces = () =>
    Widget.Box({
        class_name: "workspaces",
    }).hook(hyprland, (self) => {
        self.children = hyprland.workspaces
            .sort((a, b) => a.id - b.id)
            .map((ws) =>
                Widget.Button({
                    on_clicked: () =>
                        hyprland.message(`dispatch workspace ${ws.id}`),
                    child: Widget.Label(`${ws.id === -99 ? "X" : ws.id}`),
                    class_name:
                        "workspace" +
                        (hyprland.active.workspace.id === ws.id
                            ? " focused"
                            : ""),
                })
            )
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
        children: [
            Widget.Label({
                label: currentKeymap.bind().as((keymap) => `Keymap: ${keymap}`),
            }),
            CpuProgress(),
            Widget.Label({
                label: cpuUsage.bind().as((cpu) => `CPU usage: ${cpu}%`),
            }),
            RamProgress(),
            Widget.Label({
                label: ramUsage.bind().as((ram) => `Free Ram: ${ram}GB`),
            }),
            Widget.Label({
                label: ramPercentage.bind().as((ram) => `${ram}%`),
            }),
            AudioMenuToggle(),
            Systemtray(),
            BluetoothIndicator(),
            Battery(),
            NetworkIndicator(),
            Clock(),
            PowerMenuToggle(),
        ],
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

const PowerMenuToggle = () =>
    Widget.Button({
        on_clicked: () => show_power_menu.setValue(!show_power_menu.getValue()),
        tooltip_text: "Power Menu",
        child: Widget.Icon("archlinux-logo"),
    })

const SettingsIcon = () =>
    Widget.Button({
        on_clicked: () => show_settings.setValue(!show_settings.getValue()),
        tooltip_text: "Settings",
        child: Widget.Icon("preferences-system-symbolic"),
    })

export const Bar = (monitor = 0) =>
    Widget.Window({
        name: `bar-${monitor}`,
        class_name: "bar",
        monitor,
        anchor: ["top", "left", "right"],
        exclusivity: "exclusive",
        child: Widget.CenterBox({
            class_name: "sections",
            start_widget: Left(),
            center_widget: Center(),
            end_widget: Right(),
        }),
    })
