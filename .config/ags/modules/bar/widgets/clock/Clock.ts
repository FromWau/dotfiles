import { date } from "libs/variables"

export const Clock = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [
            Widget.Label({
                class_name: "bar-item",
                css: `min-width: 65px`,
                xalign: 1,
                label: date.bind().as((d) => d.split(";")[0]),
            }),
            Widget.Label({
                class_name: "bar-item",
                css: `min-width: 150px`,
                xalign: 1,
                label: date.bind().as((d) => d.split(";")[1]),
            }),
        ],
    })
