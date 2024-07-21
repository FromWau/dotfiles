import icons from "libs/icons"
import { cpuUsage } from "libs/variables"

export const CpuInfo = () =>
    Widget.Box({
        tooltip_text: "CPU Usage",
        children: [
            Widget.Icon({
                class_name: "bar-item",
                icon: icons.cpu,
            }),
            Widget.Label({
                class_name: "bar-item",
                css: `min-width: 50px`,
                xalign: 1,
                label: cpuUsage.bind().as((cpu) => `${cpu}%`),
            }),
        ],
    })
