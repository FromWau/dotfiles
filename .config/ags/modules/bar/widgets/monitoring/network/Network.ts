import icons from "libs/icons"

const network = await Service.import("network")

const WifiIndicator = () =>
    Widget.Box({
        spacing: 8,
        children: [
            Widget.Icon({
                icon: icons.network.wifi,
                tooltip_text: network.wifi
                    .bind("strength")
                    .as((strength) => "Singnal Strength: " + strength + "%"),
            }),
            Widget.Label({
                label: network.wifi
                    .bind("ssid")
                    .as((ssid) => ssid || "Unknown"),
            }),
        ],
    })

const WiredIndicator = () =>
    Widget.Box({
        spacing: 8,
        children: [
            Widget.Icon({
                icon: icons.network.wired,
                tooltip_text: network.wired
                    .bind("speed")
                    .as((speed) => "Speed of Interface: " + speed + "Mbps"),
            }),
        ],
    })

const OfflineIndicator = () =>
    Widget.Box({
        spacing: 8,
        children: [
            Widget.Icon({ icon: icons.network.offline }),
            Widget.Label({ label: "Offline" }),
        ],
    })

export const NetworkIndicator = () =>
    Widget.Stack({
        class_name: "bar-item",
        children: {
            wifi: WifiIndicator(),
            wired: WiredIndicator(),
            offline: OfflineIndicator(),
        },
        shown: network.bind("primary").as((p) => p || "offline"),
    })
