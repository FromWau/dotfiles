import { Astal, App, Gtk } from "astal/gtk3"
import { bind, execAsync } from "astal"
import { showMedia, showPower } from "lib/variables"

export default function Power() {
    return <window
        name="Power"
        className="Power"
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        application={App} >
        <PowerRevealer />
    </window >
}

function PowerRevealer() {
    return <revealer
        revealChild={bind(showPower)}
        transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={1000} >
        <box vertical={true} halign={Gtk.Align.CENTER} >
            <label label="Power" />
            <box
                vertical={true} >
                <button onClicked={() => showMedia.set(!showMedia.get())} >
                    Show Media
                </button >
                <button onClicked={() => execAsync("shutdown 0")} >
                    Power Off
                </button >
                <button onClicked={() => execAsync("reboot")} >
                    Reboot
                </button >
                <button onClicked={() => print("suspend")} >
                    Suspend
                </button >
                <button onClicked={() => execAsync("shutdown 30m")} >
                    Shutdown in 30 minutes
                </button >
                <button onClicked={() => execAsync("suspend 30m")} >
                    Suspend in 30 minutes
                </button >
                <button onClicked={() => execAsync("bash -c ~/.config/hypr/scripts/toggle-scale.sh")} >
                    Toggle Scale
                </button >
            </box >
        </box >
    </revealer >
}
