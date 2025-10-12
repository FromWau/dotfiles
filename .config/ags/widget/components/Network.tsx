import AstalNetwork from "gi://AstalNetwork"
import { createBinding, With } from "gnim"


export default function Network() {
    const network = AstalNetwork.get_default()

    const netIcon = createBinding(network, "primary").as(p => {
        switch (p) {
            case AstalNetwork.Primary.WIRED: return <image iconName={network.wired.iconName} />

            case AstalNetwork.Primary.WIFI: return <image
                iconName={network.wifi.iconName}
                tooltipText={network.wifi.ssid}
            />

            default: return <image iconName="network-offline" />
        }
    })

    return (
        <button>
            <With value={netIcon}>
                {(netIcon) => netIcon}
            </With>
        </button>
    )
}
