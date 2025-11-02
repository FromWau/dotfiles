import AstalBluetooth from "gi://AstalBluetooth"
import { numberToPercent } from "../../utils/format";
import { createBinding, createComputed, For, With } from "gnim";
import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import GObject from "gi://GObject"

const bluetooth = AstalBluetooth.get_default()

// Create a simple counter object to force UI updates
class RefreshTrigger extends GObject.Object {
    static {
        GObject.registerClass(
            {
                Properties: {
                    'value': GObject.ParamSpec.int(
                        'value',
                        'value',
                        'Refresh counter',
                        GObject.ParamFlags.READWRITE,
                        0, 2147483647, 0
                    ),
                },
            },
            this,
        )
    }

    _value = 0

    get value() {
        return this._value
    }

    set value(v) {
        this._value = v
        this.notify('value')
    }

    trigger() {
        this.value = this.value + 1
    }
}

const refreshTrigger = new RefreshTrigger()

function getDeviceIcon(iconName: string | null): string {
    if (!iconName) return "bluetooth-symbolic"

    if (iconName.includes("headset") || iconName.includes("headphone")) {
        return "audio-headphones-symbolic"
    }
    if (iconName.includes("phone")) {
        return "phone-symbolic"
    }
    if (iconName.includes("mouse")) {
        return "input-mouse-symbolic"
    }
    if (iconName.includes("keyboard")) {
        return "input-keyboard-symbolic"
    }
    return "bluetooth-symbolic"
}

function BluetoothMenu(popover: any) {
    const closePopover = () => popover?.popdown()

    const isPowered = createBinding(bluetooth, "isPowered")
    const devices = createBinding(bluetooth, "devices")

    // Also bind to isConnected to force re-render on connection changes
    const isConnected = createBinding(bluetooth, "isConnected")

    // Include refresh signal to force immediate updates after connect/disconnect
    const refresh = createBinding(refreshTrigger, "value")
    const allDevices = createComputed([devices, isConnected, refresh], (devs, _, __) => devs ?? [])

    const connectedDevices = allDevices.as(devs =>
        devs.filter(d => d.connected && d.name)
    )

    const availableDevices = allDevices.as(devs =>
        devs
            .filter(d => !d.connected && d.name)
            .sort((a, b) => {
                // Paired devices first
                if (a.paired !== b.paired) return b.paired ? 1 : -1
                return 0
            })
    )

    function toggleBluetooth() {
        bluetooth.adapter?.set_powered(!bluetooth.isPowered)
    }

    function scanDevices() {
        bluetooth.adapter?.start_discovery()
    }

    function handleDeviceClick(device: AstalBluetooth.Device) {
        if (device.connected) {
            device.disconnect_device((result, err) => {
                if (err) {
                    console.error("Bluetooth disconnect failed:", err)
                }
                // Force immediate UI update
                refreshTrigger.trigger()
            })
        } else if (device.paired) {
            device.connect_device((result, err) => {
                if (err) {
                    console.error("Bluetooth connect failed:", err)
                } else {
                    closePopover()
                }
                // Force immediate UI update
                refreshTrigger.trigger()
            })
        } else {
            device.pair()
            setTimeout(() => {
                device.connect_device((result, err) => {
                    if (err) {
                        console.error("Bluetooth connect failed:", err)
                    } else {
                        closePopover()
                    }
                    // Force immediate UI update
                    refreshTrigger.trigger()
                })
            }, 1000)
        }
    }

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} css="padding: 8px;">
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                <label label="Bluetooth" halign={Gtk.Align.START} css="font-weight: bold;" />

                <box spacing={8}>
                    <button hexpand onClicked={toggleBluetooth}>
                        <With value={isPowered}>
                            {(powered) => <label label={powered ? "Disable Bluetooth" : "Enable Bluetooth"} />}
                        </With>
                    </button>
                    <button onClicked={scanDevices}>
                        <label label="🔄 Scan" />
                    </button>
                </box>
            </box>

            {/* Connected Devices Section */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                <With value={createComputed([isPowered, connectedDevices], (powered, connected) => ({
                    powered,
                    connected
                }))}>
                    {({powered, connected}) => (powered && connected.length > 0) ? (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <label
                                label="Connected:"
                                halign={Gtk.Align.START}
                                css="font-size: 11px; opacity: 0.7; margin-top: 4px;"
                            />
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                                <For each={connectedDevices}>
                                    {(device) => (
                                        <box
                                            orientation={Gtk.Orientation.VERTICAL}
                                            spacing={4}
                                            css="padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;"
                                        >
                                            <box spacing={8}>
                                                <image iconName={getDeviceIcon(device.icon)} />
                                                <label
                                                    label={createBinding(device, "name")}
                                                    halign={Gtk.Align.START}
                                                    hexpand
                                                    css="font-weight: bold;"
                                                />
                                                <label
                                                    label={createBinding(device, "batteryPercentage").as(p => {
                                                        if (p == null || p === -1) return ""
                                                        return `🔋 ${numberToPercent(p, 0)}`
                                                    })}
                                                    css="font-size: 11px; opacity: 0.7;"
                                                />
                                            </box>
                                            <button
                                                onClicked={() => handleDeviceClick(device)}
                                            >
                                                <label label="Disconnect" />
                                            </button>
                                        </box>
                                    )}
                                </For>
                            </box>
                        </box>
                    ) : <box />}
                </With>
            </box>

            {/* Available Devices Section */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                <label
                    label="Available Devices:"
                    halign={Gtk.Align.START}
                    css="font-size: 11px; opacity: 0.7; margin-top: 4px;"
                />
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                    <With value={isPowered}>
                        {(powered) => powered ? (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                                <For each={availableDevices}>
                                    {(device) => {
                                        const isPaired = createBinding(device, "paired")
                                        return (
                                            <button
                                                onClicked={() => handleDeviceClick(device)}
                                                css="padding: 8px;"
                                            >
                                                <box spacing={8}>
                                                    <image iconName={getDeviceIcon(device.icon)} />
                                                    <label
                                                        label={createBinding(device, "name")}
                                                        halign={Gtk.Align.START}
                                                        hexpand
                                                    />
                                                    <With value={isPaired}>
                                                        {(paired) => paired ? (
                                                            <label
                                                                label="Paired"
                                                                css="font-size: 11px; opacity: 0.7;"
                                                            />
                                                        ) : (
                                                            <label
                                                                label="Pair"
                                                                css="font-size: 11px; opacity: 0.5;"
                                                            />
                                                        )}
                                                    </With>
                                                </box>
                                            </button>
                                        )
                                    }}
                                </For>
                            </box>
                        ) : (
                            <label
                                label="Bluetooth is disabled"
                                css="padding: 16px; opacity: 0.5;"
                            />
                        )}
                    </With>
                </box>
            </box>
        </box>
    )
}


export default function Bluetooth(): Gtk.Widget {
    let popoverRef: any

    const icon = createComputed(
        [createBinding(bluetooth, "isConnected"), createBinding(bluetooth, "isPowered")],
        (isConnected, isPowered) => {
            if (isConnected) return "bluetooth-active-symbolic"
            if (isPowered) return "bluetooth-symbolic"
            return "bluetooth-disabled-symbolic"
        }
    )

    const connectedDevName = createComputed(
        [createBinding(bluetooth, "devices"), createBinding(refreshTrigger, "value")],
        (devices, _) => devices?.find(d => d.connected)?.name
    )

    const connectedDevBattery = createComputed(
        [createBinding(bluetooth, "devices"), createBinding(refreshTrigger, "value")],
        (devices, _) => devices?.find(d => d.connected)?.batteryPercentage
    )

    const tooltipConnectedDevice = createComputed(
        [connectedDevName, connectedDevBattery],
        (name, batteryPercent) => {
            if (!name) return "Bluetooth"
            const str = `Connected to ${name}`

            if (batteryPercent == null || batteryPercent === -1) return str
            return str + ` ${numberToPercent(batteryPercent, 0)}`
        }
    )

    return (
        <menubutton
            tooltipText={tooltipConnectedDevice}
            $={(self) => {
                popoverRef = self.get_popover()
            }}
        >
            <image iconName={icon} />
            <popover>
                {BluetoothMenu(popoverRef)}
            </popover>
        </menubutton>
    )
}
