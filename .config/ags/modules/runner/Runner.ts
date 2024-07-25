import icons from "libs/icons"
import { show_runner } from "libs/variables"
import { RevealerWindow } from "modules/windows/RevealerWindow"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import "./widgets/fzf"
import { searchApps } from "./widgets/fzf"
import { Entry } from "types/widget"
import { Application } from "resource:///com/github/Aylur/ags/service/applications.js"

const WINDOW_RUNNER = "runner"

type RunnerMode = "none" | "web" | "shell" | "apps"

const runner_mode = Variable<RunnerMode>("none")

const AppItem = (app: Application) => {
    return Widget.Button({
        on_clicked: () => {
            show_runner.setValue(false)
            app.launch()
        },
        child: Widget.Box({
            children: [
                Widget.Icon({ icon: app.icon_name || "", size: 25 }),
                Widget.Label({ label: app.name }),
            ],
        }),
    })
}

const ModeIcon = () =>
    Widget.Stack({
        children: {
            none: Widget.Icon({ icon: icons.runner.mode.none, size: 25 }),
            web: Widget.Icon({ icon: icons.runner.mode.web, size: 25 }),
            shell: Widget.Icon({ icon: icons.runner.mode.shell, size: 25 }),
            apps: Widget.Icon({ icon: icons.runner.mode.apps, size: 25 }),
        },
        shown: runner_mode.bind().as((m) => m),
    })

const Search = () =>
    Widget.Entry({
        class_name: "input",
        placeholder_text: "Search",
        on_accept: (self) => {
            console.log("accept")

            searchApps(self.text || "")
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

const Result = () => {

    searchApps("")

    return Widget.Box({
        class_name: "result",
        vertical: true,
        children: [
            Widget.Label({ label: "Web" }),
            Widget.Label({ label: "Shell" }),
            Widget.Label({ label: "Apps" }),
        ],
    })
}

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
