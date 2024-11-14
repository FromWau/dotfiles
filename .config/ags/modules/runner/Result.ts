import Gtk from "gi://Gtk?version=3.0"
import { runner_mode } from "libs/variables"
import Box from "types/widgets/box"
import { SshAgentResult } from "./mode/sshAgent/SshAgentResult"
import { AppResult } from "./mode/app/AppResult"

export const RunnerResultContainer = ({
    setup,
}: {
    setup: (self: Box<Gtk.Widget, unknown>) => void
}) =>
    Widget.Box({
        class_name: "resultContainer",
        spacing: 8,
        vertical: true,
        setup: (self) => {
            setup(self)
        },
    })

const NoneResult = () => Widget.Box(Widget.Label("none"))
const WebResult = () => Widget.Box(Widget.Label("web"))
const ShellResult = () => Widget.Box(Widget.Label("shell"))

export const Result = () =>
    Widget.Stack({
        children: {
            none: NoneResult(),
            web: WebResult(),
            shell: ShellResult(),
            apps: AppResult(),
            sshAgent: SshAgentResult(),
            location: Widget.Box(Widget.Label("location")),
        },
        shown: runner_mode.bind(),
    })
