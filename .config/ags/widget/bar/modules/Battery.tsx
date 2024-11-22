import { Variable } from "astal";
import Binding, { bind } from "astal/binding";
import Battery from "gi://AstalBattery"

function getBatteryIcon(percentage: number, state: Battery.State): string {
    switch (state) {
        case Battery.State.FULLY_CHARGED:
            return "battery-full-symbolic";

        case Battery.State.CHARGING:
            if (percentage < .2)
                return "battery-charging-20-symbolic";

            if (percentage < .3)
                return "battery-charging-30-symbolic";

            if (percentage < .5)
                return "battery-charging-50-symbolic";

            if (percentage < .6)
                return "battery-charging-60-symbolic";

            if (percentage < .8)
                return "battery-charging-80-symbolic";

            if (percentage < .9)
                return "battery-charging-90-symbolic";

            return "battery-charging-full-symbolic";

        case Battery.State.DISCHARGING:
            if (percentage < .1)
                return "battery-discharging-10-symbolic";

            if (percentage < .2)
                return "battery-discharging-20-symbolic";

            if (percentage < .3)
                return "battery-discharging-30-symbolic";

            if (percentage < .5)
                return "battery-discharging-50-symbolic";

            if (percentage < .6)
                return "battery-discharging-60-symbolic";

            if (percentage < .8)
                return "battery-discharging-80-symbolic";

            if (percentage < .9)
                return "battery-discharging-90-symbolic";

            return "battery-discharging-full-symbolic";

        default: return "battery-error-symbolic";
    }
}


export default function BatteryModule() {
    const battery = Battery.get_default();
    const batPercentage = bind(battery, "percentage")
    const batState = bind(battery, "state")

    const batIcon = Variable.derive([batPercentage, batState], (percentage, state) => getBatteryIcon(percentage, state))

    return <button>
        <box>
            <label label={batPercentage.as(p => `${p * 100}%`)} />
            <icon icon={bind(batIcon).as(i => i.toString())} />
        </box>
    </button>
}
