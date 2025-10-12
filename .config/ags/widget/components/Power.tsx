import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";

function Menu() {
    return <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} >
        <label label="Power" />
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <button onClicked={() => execAsync("shutdown 0")} >
                Power Off
            </button >
            <button onClicked={() => execAsync("reboot")} >
                Reboot
            </button >
            <button onClicked={() => execAsync("suspend 0")} >
                Suspend
            </button >
            <button onClicked={() => execAsync("shutdown 30")} >
                Shutdown in 30 minutes
            </button >
            <button onClicked={() => execAsync("suspend 30")} >
                Suspend in 30 minutes
            </button >
            <button onClicked={() => execAsync("bash -c ~/.config/hypr/scripts/toggle-scale.sh")} >
                Toggle Scale
            </button >
        </box >
    </box >
}

export default function Power() {
    return <menubutton>
        <image iconName="power" />
        <popover>
            <Menu />
        </popover>
    </menubutton>
}
