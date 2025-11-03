import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";

function SectionHeader({ label }: { label: string }) {
    return (
        <label
            label={label}
            halign={Gtk.Align.START}
            css="font-size: 11px; opacity: 0.7; margin-top: 8px; margin-bottom: 4px; font-weight: bold;"
        />
    )
}

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button onClicked={onClick} css="padding: 8px;">
            <box spacing={8}>
                <image iconName={icon} />
                <label label={label} halign={Gtk.Align.START} hexpand />
            </box>
        </button>
    )
}

export default function Session() {
    let popoverRef: any

    const closePopover = () => popoverRef?.popdown()

    return (
        <menubutton
            tooltipText="Session"
            $={(self) => {
                popoverRef = self.get_popover()
            }}
        >
            <image iconName="system-shutdown-symbolic" />
            <popover>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="padding: 8px; min-width: 200px;">
                    <label label="Session" halign={Gtk.Align.START} css="font-weight: bold; margin-bottom: 4px;" />

                    {/* Session Actions */}
                    <SectionHeader label="Session" />
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <ActionButton
                            icon="system-lock-screen-symbolic"
                            label="Lock"
                            onClick={() => {
                                execAsync("loginctl lock-session")
                                closePopover()
                            }}
                        />
                        <ActionButton
                            icon="system-log-out-symbolic"
                            label="Logout"
                            onClick={() => {
                                execAsync("hyprctl dispatch exit")
                                closePopover()
                            }}
                        />
                    </box>

                    {/* Power Actions */}
                    <SectionHeader label="Power" />
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <ActionButton
                            icon="system-suspend-symbolic"
                            label="Suspend"
                            onClick={() => {
                                execAsync("systemctl suspend")
                                closePopover()
                            }}
                        />
                        <ActionButton
                            icon="system-reboot-symbolic"
                            label="Reboot"
                            onClick={() => {
                                execAsync("systemctl reboot")
                                closePopover()
                            }}
                        />
                        <ActionButton
                            icon="system-shutdown-symbolic"
                            label="Shutdown"
                            onClick={() => {
                                execAsync("systemctl poweroff")
                                closePopover()
                            }}
                        />
                    </box>

                    {/* Scheduled Actions */}
                    <SectionHeader label="Scheduled" />
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <ActionButton
                            icon="alarm-symbolic"
                            label="Suspend in 30 min"
                            onClick={() => {
                                execAsync("bash -c 'sleep 1800 && systemctl suspend'")
                                closePopover()
                            }}
                        />
                        <ActionButton
                            icon="alarm-symbolic"
                            label="Shutdown in 30 min"
                            onClick={() => {
                                execAsync("shutdown +30")
                                closePopover()
                            }}
                        />
                    </box>

                    {/* System Settings */}
                    <SectionHeader label="System" />
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                        <ActionButton
                            icon="preferences-system-symbolic"
                            label="Settings"
                            onClick={() => {
                                (globalThis as any).showSettings?.()
                                closePopover()
                            }}
                        />
                        <ActionButton
                            icon="applications-graphics-symbolic"
                            label="Generate Theme"
                            onClick={() => {
                                execAsync("hypr-wal")
                                closePopover()
                            }}
                        />
                        <ActionButton
                            icon="input-mouse-symbolic"
                            label="Mouse Mode"
                            onClick={() => {
                                execAsync("bash -c ~/.config/hypr/scripts/toggle-mouse-mode.sh")
                                closePopover()
                            }}
                        />
                    </box>
                </box>
            </popover>
        </menubutton>
    )
}
