import { ramUsage, ramPercentage } from "libs/variables"

export const RamInfo = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [
            Widget.CircularProgress({
                class_name: "bar-item",
                value: ramPercentage.bind().as((u) => u / 100),
            }),
            Widget.Label({
                class_name: "bar-item",
                label: ramUsage.bind().as((ram) => `Ram usage: ${ram}GB`),
            }),
            Widget.Label({
                class_name: "bar-item",
                label: ramPercentage.bind().as((ram) => `${ram}%`),
            }),
        ],
    })
