import { Battery } from "./battery/Battery"
import { BluetoothIndicator } from "./bluetooth/Bluetooth"
import { NetworkIndicator } from "./network/Network"

export const Monitoring = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [NetworkIndicator(), BluetoothIndicator(), Battery()],
    })
