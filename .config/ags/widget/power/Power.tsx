import { Astal, App, Gtk } from "astal/gtk3"
import { bind } from "astal"
import { showPower } from "./../variables"

export default function Power() {
    return <window
        name="Power"
        className="Power"
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        application={App}>
        < PowerRevealer />
    </window>
}

function PowerRevealer() {
    return <revealer
        revealChild={bind(showPower)}
        transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={1000} >
        <box
            vertical={true}
            halign={Gtk.Align.CENTER}>
            < label label="Power" />
            < box
                vertical={true} >
                <button
                    onClicked={() => print("shutdown 0")}>
                    Power Off
                </button>
                <button
                    onClicked={() => print("reboot")}>
                    Reboot
                </button>
                <button
                    onClicked={() => print("logout")}>
                    Logout
                </button>
                <button
                    onClicked={() => print("suspend")}>
                    Suspend
                </button>
                <button
                    onClicked={() => print("shutdown 30m")}>
                    Shutdown in 30 minutes
                </button>
                <button
                    onClicked={() => print("suspend 30m")}>
                    Suspend in 30 minutes
                </button>
            </box>
        </box>
    </revealer>
}
