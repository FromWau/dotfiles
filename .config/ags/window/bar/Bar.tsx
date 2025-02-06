import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { bind } from "astal"
import AstalBattery from "gi://AstalBattery"
import { showPower } from "lib/variables"
import Workspaces from "./modules/Workspaces"
import { Time } from "./modules/Time"
import Battery from "./modules/Battery"
import Bluetooth from "./modules/Bluetooth"
import Network from "./modules/Network"
import Tray from "./modules/Tray"

function Left() {
    return <box halign={Gtk.Align.START} >
        <button onClicked={() => showPower.set(!showPower.get())}>
            <icon icon="computer-symbolic" />
        </button>
        <Workspaces />
    </box >
}

function Middle() {
    return <box halign={Gtk.Align.CENTER} />
}

function Right() {
    return <box halign={Gtk.Align.END} >
        <Tray />
        {
            bind(AstalBattery.get_default(), "is_battery").as(b => b ? <Battery /> : <box />)
        }
        <Bluetooth />
        <Network />
        <Time />
    </box>
}

export default function Bar(gdkmonitor: Gdk.Monitor) {
    return <window
        name="Bar"
        className="Bar"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={Astal.WindowAnchor.TOP
            | Astal.WindowAnchor.LEFT
            | Astal.WindowAnchor.RIGHT}
        application={App} >
        <centerbox>
            <Left />
            <Middle />
            <Right />
        </centerbox >
    </window >
}
