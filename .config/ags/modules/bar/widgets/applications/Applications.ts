import { show_media } from "libs/variables"
import { Systemtray } from "./systemtray/Systemtray"

export const Applications = () =>
    Widget.Box({
        class_name: "bar-section",
        spacing: 8,
        children: [
            Widget.Button({
                class_name: "bar-item",
                on_clicked: () => show_media.setValue(!show_media.getValue()),
                tooltip_text: "Audio Menu",
                child: Widget.Icon("media-tape-symbolic"),
            }),
            Systemtray(),
        ],
    })
