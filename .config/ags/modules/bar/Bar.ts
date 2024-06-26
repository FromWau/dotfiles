import { Workspaces } from "./widgets/workspace/Workspace"
import { Keymap } from "./widgets/keymap/Keymap"
import { Applications } from "./widgets/applications/Applications"
import { HardwareInfo } from "./widgets/hardware/HardwareInfo"
import { Monitoring } from "./widgets/monitoring/Monitoring"
import { Clock } from "./widgets/clock/Clock"
import { Session } from "./widgets/session/Session"

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
            Keymap(),
            HardwareInfo(),
            Applications(),
            Monitoring(),
            Clock(),
            Session(),
        ],
    })

export const Bar = (monitor = 0) =>
    Widget.Window({
        name: `${WINDOW_BAR}-${monitor}`,
        class_name: "bar",
        monitor,
        anchor: ["top", "left", "right"],
        exclusivity: "exclusive",
        child: Widget.CenterBox({
            class_name: "bar-spacing",
            start_widget: Left(),
            center_widget: Center(),
            end_widget: Right(),
        }),
    })
