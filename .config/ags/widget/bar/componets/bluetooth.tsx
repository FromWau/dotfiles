import Bluetooth from "gi://AstalBluetooth"
import { bind, execAsync, Variable } from "astal";
import { Gtk } from "astal/gtk4";



const bluetooth = Bluetooth.get_default()

function BtDevice(device: Bluetooth.Device): Gtk.Widget {
    const conn = Variable.derive(
        [bind(device, "connected"), bind(device, "paired")],
        (isConnected, isPaired) => {
            if (isConnected) return "Connected"
            if (isPaired) return "Disconnected"
            return "Not Set Up"
        }
    )

    function handleClick() {
        if (device.get_connected()) {
            device.disconnect_device(() => { });
        } else if (device.get_paired()) {
            device.connect_device(() => { });
        } else {
            device.pair();
            device.connect_device(() => { });
        }
    }

    return <box hexpand spacing={8}>
        <image iconName={bind(device, "icon")} />
        <label
            label={bind(device, "name")}
            hexpand
            halign={Gtk.Align.START}
        />
        <button onClicked={handleClick}
            label={bind(conn)}
            halign={Gtk.Align.END}
        />
    </box>
}

function Menu(): Gtk.Widget {
    return <box vertical halign={Gtk.Align.CENTER} spacing={4} >
        <label label="Bluetooth" />
        <button onClicked={() => execAsync("blueberry")} >
            Open bluetooth settings
        </button>
        {
            bind(bluetooth, "devices").as(devices =>
                (devices ?? [])
                    .filter(device => (device.name ?? "") !== "")
                    .sort(device => device.connected ? 0 : 1)
                    .map(device => BtDevice(device))
            )
        }
    </box >
}


export default function BluetoothModule(): Gtk.Widget {
    const icon = Variable.derive(
        [bind(bluetooth, "isConnected"), bind(bluetooth, "isPowered")],
        (isConnected, isPowered) => {
            if (isConnected) return "bluetooth-paired-symbolic"
            if (isPowered) return "bluetooth-online-symbolic"
            return "bluetooth-offline-symbolic"
        }
    )

    return <menubutton>
        <image iconName={bind(icon)} />
        <popover>
            <Menu />
        </popover>
    </menubutton>
}
