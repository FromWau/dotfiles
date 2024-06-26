import { date } from "libs/variables"

export const Clock = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [
            Widget.Label({
                class_name: "bar-item",
                label: date.bind(),
            }),
        ],
    })
