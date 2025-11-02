import AstalNetwork from "gi://AstalNetwork"
import { Gtk } from "ags/gtk4"
import { createBinding, With, For } from "gnim"
import { execAsync } from "ags/process"

function getSignalIcon(strength: number): string {
    if (strength >= 80) return "network-wireless-signal-excellent-symbolic"
    if (strength >= 60) return "network-wireless-signal-good-symbolic"
    if (strength >= 40) return "network-wireless-signal-ok-symbolic"
    if (strength >= 20) return "network-wireless-signal-weak-symbolic"
    return "network-wireless-signal-none-symbolic"
}

function NetworkMenu(popover: any) {
    const network = AstalNetwork.get_default()
    const wifi = network.wifi

    const closePopover = () => popover?.popdown()

    const wifiEnabled = createBinding(wifi, "enabled")
    const accessPoints = createBinding(wifi, "accessPoints")
    const activeConnection = createBinding(wifi, "activeAccessPoint")

    function toggleWifi() {
        wifi.enabled = !wifi.enabled
    }

    async function connectToNetwork(ssid: string) {
        try {
            await execAsync(`nmcli device wifi connect "${ssid}"`)
            closePopover()
        } catch (err) {
            console.error("Failed to connect to network:", err)
        }
    }

    async function disconnectWifi() {
        try {
            await execAsync("nmcli device disconnect wlan0")
        } catch (err) {
            console.error("Failed to disconnect:", err)
        }
    }

    function scanWifi() {
        wifi.scan()
    }

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} css="padding: 8px;">
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                <label label="WiFi" halign={Gtk.Align.START} css="font-weight: bold;" />

                <box spacing={8}>
                    <button
                        hexpand
                        onClicked={toggleWifi}
                    >
                        <With value={wifiEnabled}>
                            {(enabled) => <label label={enabled ? "Disable WiFi" : "Enable WiFi"} />}
                        </With>
                    </button>
                    <button onClicked={() => { scanWifi(); }}>
                        <label label="🔄 Scan" />
                    </button>
                </box>

                <With value={activeConnection}>
                    {(active) => active && (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="margin-top: 8px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                            <label
                                label="Connected to:"
                                halign={Gtk.Align.START}
                                css="font-size: 11px; opacity: 0.7;"
                            />
                            <box spacing={8}>
                                <image iconName={getSignalIcon(active.strength)} />
                                <label
                                    label={active.ssid}
                                    halign={Gtk.Align.START}
                                    css="font-weight: bold;"
                                    hexpand
                                />
                                <label
                                    label={`${active.strength}%`}
                                    css="font-size: 11px; opacity: 0.7;"
                                />
                            </box>
                            <button onClicked={disconnectWifi}>
                                <label label="Disconnect" />
                            </button>
                        </box>
                    )}
                </With>
            </box>

            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={2}
            >
                <label
                    label="Available Networks:"
                    halign={Gtk.Align.START}
                    css="font-size: 11px; opacity: 0.7; margin-top: 4px;"
                />
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                    <With value={wifiEnabled}>
                        {(enabled) => enabled ? (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                                <For each={accessPoints.as(aps =>
                                    // Filter out duplicates and sort by strength
                                    aps.filter((ap, index, self) =>
                                        index === self.findIndex(a => a.ssid === ap.ssid)
                                    ).sort((a, b) => b.strength - a.strength)
                                )}>
                                    {(ap) => (
                                        <button
                                            onClicked={() => {
                                                connectToNetwork(ap.ssid)
                                            }}
                                            css="padding: 8px;"
                                        >
                                            <box spacing={8}>
                                                <image iconName={getSignalIcon(ap.strength)} />
                                                <label
                                                    label={ap.ssid}
                                                    halign={Gtk.Align.START}
                                                    hexpand
                                                />
                                                <With value={activeConnection}>
                                                    {(active) => active?.ssid === ap.ssid ? (
                                                        <image iconName="emblem-ok-symbolic" />
                                                    ) : <box />}
                                                </With>
                                                <label
                                                    label={`${ap.strength}%`}
                                                    css="font-size: 11px; opacity: 0.7;"
                                                />
                                            </box>
                                        </button>
                                    )}
                                </For>
                            </box>
                        ) : (
                            <label
                                label="WiFi is disabled"
                                css="padding: 16px; opacity: 0.5;"
                            />
                        )}
                    </With>
                </box>
            </box>
        </box>
    )
}

export default function Network() {
    const network = AstalNetwork.get_default()
    const wifi = network.wifi
    let popoverRef: any

    const wifiStrength = createBinding(wifi, "strength")
    const wifiSsid = createBinding(wifi, "ssid")
    const primary = createBinding(network, "primary")

    return (
        <menubutton
            $={(self) => {
                popoverRef = self.get_popover()
            }}
        >
            <With value={primary}>
                {(p) => {
                    switch (p) {
                        case AstalNetwork.Primary.WIRED:
                            return <image iconName={network.wired.iconName} />

                        case AstalNetwork.Primary.WIFI:
                            return <image
                                iconName={getSignalIcon(wifiStrength.get())}
                                tooltipText={wifiSsid.get()}
                            />

                        default:
                            return <image iconName="network-offline-symbolic" />
                    }
                }}
            </With>
            <popover>
                {NetworkMenu(popoverRef)}
            </popover>
        </menubutton>
    )
}
