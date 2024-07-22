import { show_media } from "libs/variables"
import { RevealerWindow } from "modules/windows/RevealerWindow"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { Players } from "./widgets/Player"

const WINDOW_MEDIA = "media"

export const MediaWindow = (monitor: number = 0): Gtk.Window =>
    RevealerWindow({
        name: `${WINDOW_MEDIA}-${monitor}`,
        monitor: monitor,
        anchor: ["top", "left"],
        transition: "slide_down",
        binding: show_media.bind(),
        child: Widget.Box({
            class_name: "media",
            vertical: true,
            children: [Players()],
        }),
    })
