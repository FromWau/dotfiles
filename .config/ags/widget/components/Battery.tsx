import { createBinding, Accessor, With } from "gnim"
import AstalBattery from "gi://AstalBattery"
import { numberToPercent } from "../../utils/format";

export default function Battery() {
    const battery = AstalBattery.get_default();

    const batPercentage = createBinding(battery, "percentage").as(p => numberToPercent(p, 0))
    const batIcon = createBinding(battery, "battery_icon_name")
    const hasBattery = createBinding(battery, "is_battery")

    return (
        <box>
            <With value={hasBattery}>
                {(hasBattery) => hasBattery && (
                    <box>
                        <image iconName={batIcon} />
                        <label label={batPercentage} />
                    </box>
                )}
            </With>
        </box >
    )
}
