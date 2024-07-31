import icons from "libs/icons"
import { show_runner, runner_mode } from "libs/variables"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { Result } from "./Result"
import { queryApps } from "./mode/app/QueryApps"
import { querySshAgentKeys } from "./mode/sshAgent/QuerySshAgent"
import { queryLocation } from "./mode/location/queryLocation"

const WINDOW_RUNNER = "runner"

const ModeIcon = () =>
    Widget.Stack({
        class_name: "runnerModeIcon",
        children: {
            none: Widget.Icon({ icon: icons.runner.mode.none }),
            web: Widget.Icon({ icon: icons.runner.mode.web }),
            shell: Widget.Icon({ icon: icons.runner.mode.shell }),
            apps: Widget.Icon({ icon: icons.runner.mode.apps }),
            sshAgent: Widget.Icon({ icon: icons.runner.mode.sshAgent }),
            location: Widget.Icon({ icon: icons.runner.mode.location }),
        },
        shown: runner_mode.bind(),
    })

const Search = () =>
    Widget.Entry({
        class_name: "input",
        placeholder_text: "Search",
        on_accept: (self) => {
            switch (runner_mode.getValue()) {
                case "none":
                    break
                case "web":
                    break
                case "shell":
                    break
                case "apps":
                    queryApps(self.text || "")
                    break
                case "sshAgent":
                    querySshAgentKeys(self.text || "")
                    break
                case "location":
                    queryLocation(self.text || "")
                    break
            }
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
            Result(),
            Widget.Box({
                spacing: 8,
                children: [
                    Widget.Label({
                        label: show_runner.bind().as((r) => `show: ${r}`),
                    }),
                    Widget.Label({
                        label: runner_mode.bind().as((m) => `mode: ${m}`),
                    }),
                ],
            }),
        ],
    })

export const RunnerWindow = (monitor: number = 0) =>
    // RevealerWindow({
    //     name: `${WINDOW_RUNNER}-${monitor}`,
    //     monitor: monitor,
    //     anchor: show_runner
    //         .bind()
    //         .as((r) =>
    //             r
    //                 ? ["top", "left", "right", "bottom"]
    //                 : ["left", "right", "bottom"]
    //         ),
    //     window_position: Gtk.WindowPosition.CENTER,
    //     transition: "slide_up",
    //     keymode: show_runner.bind().as((r) => (r ? "exclusive" : "none")),
    //     exclusivity: "ignore",
    //     vexpand: true,
    //     hexpand: true,
    //     binding: show_runner.bind(),
    //     child: widget.eventbox({
    //         class_name: "runnerspace",
    //         child: runner(),
    //         on_primary_click: () => show_runner.setvalue(false),
    //     }),
    // })
    Widget.Window({
        name: `${WINDOW_RUNNER}-${monitor}`,
        monitor: monitor,
        window_position: Gtk.WindowPosition.CENTER,
        anchor: ["left", "right", "bottom", "top"],
        keymode: "exclusive",
        exclusivity: "ignore",
        visible: false,
        class_name: "runnerSpace",
        child: Widget.EventBox({
            child: Runner(),
            on_primary_click: () => show_runner.setValue(false),
        }),
    })
