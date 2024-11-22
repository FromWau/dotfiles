import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import Workspaces from "./modules/Workspaces"
import { showPower } from "./../variables"
import { Time } from "./modules/Time"
import Battery from "./modules/Battery"


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
    return <box
        halign={Gtk.Align.END} >
        <Battery />
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
