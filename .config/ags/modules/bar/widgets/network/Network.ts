import icons from "libs/icons"

const network = await Service.import("network")

const WifiIndicator = () =>
    Widget.Box({
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
        children: [
            Widget.Icon({ icon: icons.network.offline }),
            Widget.Label({ label: "Offline" }),
        ],
    })

export const NetworkIndicator = () =>
    Widget.Stack({
        children: {
            wifi: WifiIndicator(),
            wired: WiredIndicator(),
            offline: OfflineIndicator(),
        },
        shown: network.bind("primary").as((p) => p || "offline"),
    })
