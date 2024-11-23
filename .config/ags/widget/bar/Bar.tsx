import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import Workspaces from "./modules/Workspaces"
import { showPower } from "./../variables"
import { Time } from "./modules/Time"
import Battery from "gi://AstalBattery"
import BatteryModule from "./modules/Battery"
import Bluetooth from "./modules/Bluetooth"
import Network from "./modules/Network"
import { bind } from "astal"


function Left() {
    return <box
        halign={Gtk.Align.START} >
        <button
            onClicked={() => showPower.set(!showPower.get())} >
            Arch
        </button >
        <Workspaces />
    </box >
}

function Middle() {
    return <box
        halign={Gtk.Align.CENTER} >
    </box >
}

function Right() {
    var dynamicChildren = []

    const isBattery = bind(Battery.get_default(), "is_battery")
    if (isBattery.get()) {
        dynamicChildren.push(<BatteryModule />)
    }

    return <box
        halign={Gtk.Align.END} >
        {dynamicChildren}
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
