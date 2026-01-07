import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { onCleanup } from "ags"
import Weather from "./components/Weather"
import Time from "./components/Time"
import Battery from "./components/Battery"
import Cpu from "./components/Cpu"
import Ram from "./components/Ram"
import Gpu from "./components/Gpu"
import Tray from "./components/Tray"
import Session from "./components/Session"
import Network from "./components/Network"
import Workspaces from "./components/Workspaces"
import Bluetooth from "./components/Bluetooth"
import AppLauncher from "./components/AppLauncher"
import MouseModeIndicator from "./components/MouseModeIndicator"
import MediaPlayer from "./components/MediaPlayer"
import { currentDisplayMode } from "../utils/displayMode"

export default function Bar(gdkmonitor: Gdk.Monitor) {
    return (
        <window
            visible
            name="bar"
            class="Bar"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
            application={app}
            $={(self) => onCleanup(() => self.destroy())}
        >
            <centerbox cssName="centerbox">
                <box $type="start" hexpand halign={Gtk.Align.START} spacing={8}>
                    <Workspaces />
                    <AppLauncher />
                </box>

                <box $type="center">
                    <MouseModeIndicator />
                </box>

                <box $type="end" hexpand halign={Gtk.Align.END} spacing={8}>
                    <Bluetooth />
                    <Network />
                    <Session />
                    <Tray />
                    <MediaPlayer />
                    <Weather />
                    <box visible={currentDisplayMode.as((mode) => mode === "normal")} spacing={8}>
                        <Cpu />
                        <Ram />
                        <Gpu />
                    </box>
                    <Battery />
                    <Time />
                </box>
            </centerbox>
        </window>
    )
}
