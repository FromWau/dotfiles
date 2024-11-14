import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable } from "astal"
import Workspaces from "./modules/Workspaces"

const time = Variable("").poll(1000, "date '+%T %a, %d. %_B(%m) %Y'")


function Left() {
    return <box
        halign={Gtk.Align.START} >
        <button
            onClicked={() => print("test")}>
            Welcome to AGS!
        </button>
        <Workspaces />
    </box>
}

function Middle() {
    return <box
        halign={Gtk.Align.CENTER} >
    </box>
}

function Right() {
    return <box
        halign={Gtk.Align.END} >
        <button
            onClick={() => { }} >
            <label label={time()} />
        </button>
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
        application={App}>
        <centerbox>
            <Left />
            <Middle />
            <Right />
        </centerbox>
    </window>
}
