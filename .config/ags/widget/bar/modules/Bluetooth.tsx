import Bluetooth from "gi://AstalBluetooth"
import { bind } from "astal/binding";


export default function BluetoothModule() {
    const bluetooth = Bluetooth.get_default()

    return <box>
        {bind(bluetooth, "devices").as(devices => devices
            .filter(d => d.get_connected())
            .map(d =>
                <button>
                    <box>
                        <icon icon="bluetooth-symbolic" />
                        <box>
                            <icon icon={d.get_icon()} />
                            <label label={d.get_name()} />
                        </box>
                    </box>
                </button>
            )
        )}
    </box>
}

