import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import Workspaces from "./componets/workspaces"
import { cpuUsage, memAvailable, memFree, time } from "utils/variables"
import Power from "./componets/power"
import { bind, Variable } from "astal"
import AstalBattery from "gi://AstalBattery?version=0.1"
import Battery from "./componets/battery"
import Bluetooth from "./componets/bluetooth"
import Network from "./componets/network"
import Tray from "./componets/tray"


export default function Bar(gdkmonitor: Gdk.Monitor) {

    const mem = Variable.derive(
        [bind(memFree), bind(memAvailable)],
        (free, available) => `${free}/${available}`
    )

    return <window
        visible
        cssClasses={["Bar"]}
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        application={App}>
        <centerbox cssName="centerbox">
            <box hexpand halign={Gtk.Align.START}>
                <Workspaces />
            </box>

            <box hexpand halign={Gtk.Align.CENTER} />

            <box hexpand halign={Gtk.Align.END}>
                <button hexpand>
                    <box spacing={4}>
                        <image iconName="cpu" />
                        <label label={bind(cpuUsage)} widthRequest={60} />
                    </box>
                </button>

                <button>
                    <box spacing={4}>
                        <image iconName="memory" />
                        <label label={bind(mem)} width_request={130}/>
                    </box>
                </button>

                <Tray />

                {
                    bind(AstalBattery.get_default(), "is_battery").as(b => b ? <Battery /> : <box />)
                }

                <Bluetooth />
                <Network />

                <menubutton>
                    <image iconName="power" />
                    <popover>
                        <Power />
                    </popover>
                </menubutton>

                <menubutton>
                    <label label={time()} widthRequest={285} />
                    <popover>
                        <Gtk.Calendar />
                    </popover>
                </menubutton>
            </box>
        </centerbox>
    </window>
}
