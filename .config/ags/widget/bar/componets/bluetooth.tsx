import Bluetooth from "gi://AstalBluetooth"
import { bind } from "astal/binding";
import { execAsync } from "astal";


export default function BluetoothModule() {
    const bluetooth = Bluetooth.get_default()

    return <box>
        {bind(bluetooth, "devices").as(devices => devices
            .filter(d => d.get_connected())
            .map(d =>
                <button onClicked={() => execAsync("blueberry")} >
                    <box>
                        <image iconName="bluetooth-symbolic" />
                        <box>
                            <image
                                iconName={d.get_icon()}
                                tooltipText={d.get_name()}
                            />
                        </box>
                    </box>
                </button>
            )
        )}
    </box>
}
