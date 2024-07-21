import icons from "libs/icons"
import { ramUsage, ramPercentage } from "libs/variables"

export const RamInfo = () =>
    Widget.Box({
        tooltip_text: "RAM Usage",
        children: [
            Widget.Icon({
                class_name: "bar-item",
                icon: icons.ram,
            }),
            Widget.Label({
                class_name: "bar-item",
                css: `min-width: 50px`,
                xalign: 1,
                label: ramUsage.bind().as((ram) => `${ram}GB`),
            }),
            Widget.Label({
                class_name: "bar-item",
                css: `min-width: 50px`,
                xalign: 1,
                label: ramPercentage.bind().as((ram) => `${ram}%`),
            }),
        ],
    })
