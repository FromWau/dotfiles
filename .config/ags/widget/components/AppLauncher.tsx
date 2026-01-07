import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { currentDisplayMode } from "../../utils/displayMode"

interface App {
    name: string
    icon: string
    command: string
}

const apps: App[] = [
    { name: "Firefox", icon: "firefox", command: "firefox" },
    { name: "Files", icon: "system-file-manager", command: "nautilus" },
    { name: "Terminal", icon: "utilities-terminal", command: "kitty" },
    { name: "Discord", icon: "discord", command: "discord" },
    { name: "Spotify", icon: "spotify", command: "spotify" },
    { name: "VS Code", icon: "code", command: "code" },
    { name: "Steam", icon: "steam", command: "steam" },
    { name: "Settings", icon: "preferences-system", command: "gnome-control-center" },
]

function AppButton({ app }: { app: App }) {
    return (
        <button
            onClicked={() => execAsync(app.command)}
            css="padding: 16px; min-width: 120px; min-height: 100px;"
            tooltipText={app.name}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                <image iconName={app.icon} css="font-size: 48px;" />
                <label label={app.name} css="font-size: 14px;" />
            </box>
        </button>
    )
}

export default function AppLauncher() {
    let popoverRef: any

    return (
        <menubutton
            visible={currentDisplayMode.as((mode) => mode === "mouse")}
            tooltipText="Apps"
            $={(self) => {
                popoverRef = self.get_popover()
            }}
        >
            <box spacing={4}>
                <image iconName="view-app-grid-symbolic" css="font-size: 20px;" />
                <label label="Apps" css="font-size: 14px; font-weight: bold;" />
            </box>
            <popover>
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    css="padding: 16px; min-width: 400px;"
                >
                    <label
                        label="Applications"
                        halign={Gtk.Align.START}
                        css="font-size: 18px; font-weight: bold; margin-bottom: 8px;"
                    />

                    {/* App Grid */}
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <box spacing={8}>
                            {apps.slice(0, 4).map((app) => (
                                <AppButton app={app} />
                            ))}
                        </box>
                        <box spacing={8}>
                            {apps.slice(4, 8).map((app) => (
                                <AppButton app={app} />
                            ))}
                        </box>
                    </box>
                </box>
            </popover>
        </menubutton>
    )
}
