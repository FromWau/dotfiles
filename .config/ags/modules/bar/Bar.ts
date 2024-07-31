import { Workspaces } from "./widgets/workspace/Workspace"
import { Keymap } from "./widgets/keymap/Keymap"
import { Applications } from "./widgets/applications/Applications"
import { HardwareInfo } from "./widgets/hardware/HardwareInfo"
import { Monitoring } from "./widgets/monitoring/Monitoring"
import { Clock } from "./widgets/clock/Clock"
import { Session } from "./widgets/session/Session"
import { Weather } from "./widgets/weather/Weather"

const WINDOW_BAR = "bar"

const Left = () =>
    Widget.Box({
        children: [Workspaces()],
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
            Weather(),
            Keymap(),
            HardwareInfo(),
            Applications(),
            Monitoring(),
            Clock(),
            Session(),
        ],
    })

export const Bar = () =>
    Widget.Box({
        class_name: "bar",
        child: Widget.CenterBox({
            vexpand: true,
            hexpand: true,
            class_name: "bar-spacing",
            start_widget: Left(),
            center_widget: Center(),
            end_widget: Right(),
        }),
    })

export const BarWindow = (monitor = 0) =>
    Widget.Window({
        name: `${WINDOW_BAR}-${monitor}`,
        monitor,
        anchor: ["top", "left", "right"],
        exclusivity: "exclusive",
        child: Bar(),
    })
