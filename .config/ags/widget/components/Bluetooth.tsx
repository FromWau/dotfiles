import AstalBluetooth from "gi://AstalBluetooth"
import { numberToPercent } from "../../utils/format";
import { createBinding, createComputed, For } from "gnim";
import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";



const bluetooth = AstalBluetooth.get_default()

function BtDevice(device: AstalBluetooth.Device): Gtk.Widget {
    const conn = createComputed(
        [createBinding(device, "connected"), createBinding(device, "paired")],
        (isConnected, isPaired) => {
            if (isConnected) return "Connected"
            if (isPaired) return "Disconnected"
            return "Not Set Up"
        }
    )

    function handleClick() {
        if (device.get_connected()) {
            device.disconnect_device((result, err) => {
                if (err) console.error("Bluetooth disconnect failed:", err)
            });
        } else if (device.get_paired()) {
            device.connect_device((result, err) => {
                if (err) console.error("Bluetooth connect failed:", err)
            });
        } else {
            device.pair();
            device.connect_device((result, err) => {
                if (err) console.error("Bluetooth connect failed:", err)
            });
        }
    }

    return (
        <box hexpand spacing={8}>
            <image iconName={createBinding(device, "icon")} />
            <label
                label={createBinding(device, "name")}
                hexpand
                halign={Gtk.Align.START}
            />
            <label
                label={createBinding(device, "batteryPercentage").as(p => {
                    if (p == null || p === -1) return ""
                    return `${numberToPercent(p, 0)}`
                })
                }
                hexpand
                halign={Gtk.Align.START}
            />
            <button onClicked={handleClick}
                label={conn}
                halign={Gtk.Align.END}
            />
        </box>
    )
}

function Menu() {
    const btDevices = createBinding(bluetooth, "devices").as(devices =>
        (devices ?? [])
            .filter(device => (device.name ?? "") !== "")
            .sort((a, b) => (b.connected ? 1 : 0) - (a.connected ? 1 : 0))
            .map(device => BtDevice(device))
    )

    return <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.CENTER} spacing={4} >
        <label label="Bluetooth" />
        <button onClicked={() => execAsync("blueberry")} >
            Open bluetooth settings
        </button>

        <For each={btDevices}>
            {dev => dev}
        </For>
    </box>
}


export default function Bluetooth(): Gtk.Widget {
    const icon = createComputed(
        [createBinding(bluetooth, "isConnected"), createBinding(bluetooth, "isPowered")],
        (isConnected, isPowered) => {
            if (isConnected) return "bluetooth-paired-symbolic"
            if (isPowered) return "bluetooth-online-symbolic"
            return "bluetooth-offline-symbolic"
        }
    )

    const connectedDevName = createBinding(bluetooth, "devices")
        .as(devices => devices
            ?.find(d => d.connected)
            ?.name
        )

    const connectedDevBattery = createBinding(bluetooth, "devices")
        .as(devices => devices
            ?.find(d => d.connected)
            ?.batteryPercentage
        );


    const tooltipConnectedDevice = createComputed(
        [connectedDevName, connectedDevBattery],
        (name, batteryPercent) => {
            const str = `Connected to ${name}`

            if (batteryPercent == null || batteryPercent === -1) return str
            return str + ` ${numberToPercent(batteryPercent, 0)}`
        }
    )


    return (
        <menubutton
            tooltipText={tooltipConnectedDevice} >
            <image iconName={icon} />
            <popover>
                <Menu />
            </popover>
        </menubutton>
    )
}
