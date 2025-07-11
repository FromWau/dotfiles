import { execAsync } from "astal"
import { Gtk } from "astal/gtk4"

export default function Power() {
    return <box vertical halign={Gtk.Align.CENTER} >
        <label label="Power" />
        <box vertical spacing={4}>
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
}
