import { toggleSessionMenu } from "libs/utils"

export const Session = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [
            Widget.Button({
                on_clicked: () => toggleSessionMenu(),
                class_name: "bar-item",
                tooltip_text: "Session Menu",
                child: Widget.Icon("archlinux-logo"),
            }),
        ],
    })
