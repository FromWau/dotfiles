import { bind } from "astal/binding";
import Battery from "gi://AstalBattery"

export default function BatteryModule() {
    const battery = Battery.get_default();

    const batPercentage = bind(battery, "percentage").as(p => Math.round(p * 100))
    const batIcon = bind(battery, "battery_icon_name")

    return <button>
        <box>
            <label label={batPercentage.as(p => `${p}%`)} />
            <icon icon={bind(batIcon)} />
        </box>
    </button>
}
