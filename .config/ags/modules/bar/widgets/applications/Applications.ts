import { show_media, show_runner } from "libs/variables"
import { getSystemTrayItems } from "./systemtray/Systemtray"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import icons from "libs/icons"
import { queryApps } from "modules/runner/mode/app/QueryApps"

export const Applications = () =>
    Widget.Box({
        setup: (self) => {
            var childrean: Gtk.Widget[] = []

            childrean.push(
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

            childrean.push(
                Widget.Button({
                    class_name: show_runner
                        .bind()
                        .as(
                            (isShown) =>
                                "bar-item" + (isShown ? " focused" : "")
                        ),
                    on_clicked: () => queryApps(""),
                    tooltip_text: "Runner",
                    child: Widget.Icon({ icon: icons.runner.icon }),
                })
            )

            childrean.push(
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

            childrean.push(
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

            childrean.push(
                Widget.Button({
                    class_name: "bar-item",
                    on_clicked: () =>
                        Utils.execAsync("hypr-wal").catch(() => {
                            // User canceled program. Do nothing.
                        }),
                    tooltip_text: "Screencast",
                    child: Widget.Icon({ icon: icons.hyprwall }),
                })
            )

            const trayItems = getSystemTrayItems()

            if (trayItems.length > 0) {
                childrean.push(
                    Widget.Box({
                        class_name: "bar-item",
                        children: trayItems,
                    })
                )
            }

            self.children = childrean
        },
    })
