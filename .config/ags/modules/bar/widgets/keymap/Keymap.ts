import { currentKeymap } from "libs/variables"

export const Keymap = () =>
    Widget.Box({
        class_name: "bar-section",
        children: [
            Widget.Label({
                class_name: "bar-item",
                label: currentKeymap.bind().as((keymap) => `Keymap: ${keymap}`),
            }),
        ],
    })
