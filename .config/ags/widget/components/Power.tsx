import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";

export default function Power() {
    let popoverRef: any

    return <menubutton
        $={(self) => {
            popoverRef = self.get_popover()
        }}
    >
        <image iconName="power" />
        <popover>
            <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} >
                <label label="Power" />
                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    <button onClicked={() => {
                        (globalThis as any).showSettings?.()
                        popoverRef?.popdown()
                    }} >
                        Settings
                    </button >
                    <button onClicked={() => {
                        execAsync("systemctl poweroff")
                        popoverRef?.popdown()
                    }} >
                        Power Off
                    </button >
                    <button onClicked={() => {
                        execAsync("systemctl reboot")
                        popoverRef?.popdown()
                    }} >
                        Reboot
                    </button >
                    <button onClicked={() => {
                        execAsync("systemctl suspend")
                        popoverRef?.popdown()
                    }} >
                        Suspend
                    </button >
                    <button onClicked={() => {
                        execAsync("shutdown +30")
                        popoverRef?.popdown()
                    }} >
                        Shutdown in 30 minutes
                    </button >
                    <button onClicked={() => {
                        execAsync("bash -c 'sleep 1800 && systemctl suspend'")
                        popoverRef?.popdown()
                    }} >
                        Suspend in 30 minutes
                    </button >
                    <button onClicked={() => {
                        execAsync("bash -c ~/.config/hypr/scripts/toggle-scale.sh")
                        popoverRef?.popdown()
                    }} >
                        Toggle Scale
                    </button >
                </box >
            </box >
        </popover>
    </menubutton>
}
