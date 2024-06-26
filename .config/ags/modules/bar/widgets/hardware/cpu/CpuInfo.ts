import { cpuUsage } from "libs/variables"

export const CpuInfo = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [
            Widget.CircularProgress({
                class_name: "bar-item",
                value: cpuUsage.bind().as((u) => u / 100),
            }),
            Widget.Label({
                class_name: "bar-item",
                label: cpuUsage.bind().as((cpu) => `CPU usage: ${cpu}%`),
            }),
        ],
    })
