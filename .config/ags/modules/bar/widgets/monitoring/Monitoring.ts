import { Battery } from "./battery/Battery"
import { BluetoothIndicator } from "./bluetooth/Bluetooth"
import { NetworkIndicator } from "./network/Network"

export const Monitoring = () =>
    Widget.Box({
        children: [NetworkIndicator(), BluetoothIndicator(), Battery()],
    })
