import icons from "libs/icons"
import { currentKeymap } from "libs/variables"

export const Keymap = () =>
    Widget.Box({
        tooltip_text: "Current Keymap",
        children: [
            Widget.Icon({
                class_name: "bar-item",
                icon: icons.keymap,
            }),
            Widget.Label({
                class_name: "bar-item",
                label: currentKeymap.bind(),
            }),
        ],
    })
