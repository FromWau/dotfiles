import { show_media } from "libs/variables"
import { Systemtray } from "./systemtray/Systemtray"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

const systemtray = await Service.import("systemtray")

export const Applications = () =>
    Widget.Box({
        setup: (self) => {
            var childs: Gtk.Widget[] = []

            childs.push(
                Widget.Button({
                    class_name: show_media
                        .bind()
                        .as(
                            (isShown) =>
                                "bar-item" + (isShown ? " focused" : "")
                        ),
                    on_clicked: () =>
                        show_media.setValue(!show_media.getValue()),
                    tooltip_text: "Audio Menu",
                    child: Widget.Icon("media-tape-symbolic"),
                })
            )

            childs.push(Systemtray())

            self.children = childs
        },
    })
