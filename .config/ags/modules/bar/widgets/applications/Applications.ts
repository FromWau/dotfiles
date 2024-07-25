import { show_media, show_runner } from "libs/variables"
import { Systemtray } from "./systemtray/Systemtray"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import icons from "libs/icons"

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

            childs.push(
                Widget.Button({
                    class_name: show_runner
                        .bind()
                        .as(
                            (isShown) =>
                                "bar-item" + (isShown ? " focused" : "")
                        ),
                    on_clicked: () =>
                        show_runner.setValue(!show_runner.getValue()),
                    tooltip_text: "Runner",
                    child: Widget.Icon({ icon: icons.runner.icon }),
                })
            )

            childs.push(
                Widget.Button({
                    class_name: "bar-item",
                    on_clicked: () =>
                        Utils.execAsync("qr").catch(() => {
                            // User canceled program. Do nothing.
                        }),
                    tooltip_text: "QR Scanner",
                    child: Widget.Icon({ icon: icons.qr }),
                })
            )

            childs.push(
                Widget.Button({
                    class_name: "bar-item",
                    on_primary_click: () =>
                        Utils.execAsync("screenshot -m region -c -z").catch(
                            () => {
                                // User canceled program. Do nothing.
                            }
                        ),
                    on_secondary_click: () =>
                        Utils.execAsync("screenshot -m region -c -z -e").catch(
                            () => {
                                // User canceled program. Do nothing.
                            }
                        ),
                    tooltip_text: "Screenshot",
                    child: Widget.Icon({ icon: icons.screenshot }),
                })
            )

            childs.push(Systemtray())

            self.children = childs
        },
    })
