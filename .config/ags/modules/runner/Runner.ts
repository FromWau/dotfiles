import icons from "libs/icons"
import { show_runner } from "libs/variables"
import { RevealerWindow } from "modules/windows/RevealerWindow"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

const WINDOW_RUNNER = "runner"

const ModeIcon = () =>
    Widget.Stack({
        children: {
            none: Widget.Icon({ icon: icons.runner.mode.none, size: 25 }),
            web: Widget.Icon({ icon: icons.runner.mode.web, size: 25 }),
            shell: Widget.Icon({ icon: icons.runner.mode.shell, size: 25 }),
            apps: Widget.Icon({ icon: icons.runner.mode.apps, size: 25 }),
        },
        shown: "none",
    })

const Search = () =>
    Widget.Entry({
        class_name: "input",
        placeholder_text: "Search",
        on_accept: () => {
            console.log("accept")
        },
    }).keybind("Escape", () => show_runner.setValue(false))

const Input = () =>
    Widget.Box({
        class_name: "inputContainer",
        vertical: false,
        spacing: 16,
        setup: (self) => {
            const s = Search()
            self.children = [ModeIcon(), s]

            s.grab_focus()
        },
    })

export const Runner = () =>
    Widget.Box({
        class_name: "runner",
        vpack: "center",
        hpack: "center",
        hexpand: true,
        vexpand: true,
        vertical: true,
        children: [
            Input(),
            Widget.Label({
                label: show_runner.bind().as((r) => `show: ${r}`),
            }),
        ],
    })

export const RunnerWindow = (monitor: number = 0) =>
    RevealerWindow({
        name: `${WINDOW_RUNNER}-${monitor}`,
        monitor: monitor,
        anchor: show_runner
            .bind()
            .as((r) =>
                r
                    ? ["top", "left", "right", "bottom"]
                    : ["left", "right", "bottom"]
            ),
        window_position: Gtk.WindowPosition.CENTER,
        transition: "slide_up",
        keymode: show_runner.bind().as((r) => (r ? "exclusive" : "none")),
        exclusivity: "ignore",
        vexpand: true,
        hexpand: true,
        binding: show_runner.bind(),
        child: Widget.EventBox({
            class_name: "runnerSpace",
            child: Runner(),
            on_primary_click: () => show_runner.setValue(false),
        }),
    })
