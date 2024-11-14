import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { Workspaces } from "./widgets/workspace/Workspace"
import { Keymap } from "./widgets/keymap/Keymap"
import { Applications } from "./widgets/applications/Applications"
import { HardwareInfo } from "./widgets/hardware/HardwareInfo"
import { Monitoring } from "./widgets/monitoring/Monitoring"
import { Clock } from "./widgets/clock/Clock"
import { Session } from "./widgets/session/Session"
import { Weather } from "./widgets/weather/Weather"
import { is_scaled } from "libs/variables"

const WINDOW_BAR = "bar"

const Left = () =>
    Widget.Box({
        spacing: 8,
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
        setup: (self) =>
            self.hook(is_scaled, () => {
                var childrean: Gtk.Widget[] = []

                if (is_scaled.getValue()) {
                    childrean.push(Applications())
                    childrean.push(Monitoring())
                    childrean.push(Clock())
                    childrean.push(Session())
                } else {
                    childrean.push(Weather())
                    childrean.push(Keymap())
                    childrean.push(HardwareInfo())
                    childrean.push(Applications())
                    childrean.push(Monitoring())
                    childrean.push(Clock())
                    childrean.push(Session())
                }

                self.children = childrean
            }),
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
