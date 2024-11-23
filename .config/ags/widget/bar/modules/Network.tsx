import { bind } from "astal/binding"
import Network from "gi://AstalNetwork"


export default function NetworkModule() {
    const network = Network.get_default()

    const netIcon = bind(network, "primary").as(p => {
        switch (p) {
            case Network.Primary.WIRED: return <icon icon={network.wired.iconName} />

            case Network.Primary.WIFI: return <icon
                icon={network.wifi.iconName}
                tooltipText={network.wifi.ssid}
            />

            default: return <icon icon="network-offline" />
        }
    })

    return <button>
        {netIcon}
    </button>
}
