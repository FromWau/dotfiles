import { BatteryIndicator } from "./battery/Battery"
import { BluetoothIndicator } from "./bluetooth/Bluetooth"
import { NetworkIndicator } from "./network/Network"
import { SshAgendIndicator } from "./ssh_agent/SshAgent"

export const Monitoring = () =>
    Widget.Box({
        children: [
            NetworkIndicator(),
            BluetoothIndicator(),
            BatteryIndicator(),
            SshAgendIndicator(),
        ],
    })
