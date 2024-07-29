import {
    runner_mode,
    runner_query_result,
    runner_selected_result,
    show_runner,
} from "libs/variables"
import { Application } from "resource:///com/github/Aylur/ags/service/applications.js"

const NoneResult = () => Widget.Box(Widget.Label("none"))
const WebResult = () => Widget.Box(Widget.Label("web"))
const ShellResult = () => Widget.Box(Widget.Label("shell"))
const AppResult = () => Widget.Box(Widget.Label("apps"))
// searchApps("")

const SshAgentResult = () =>
    Widget.Box({
        class_name: "resultContainer",
        spacing: 8,
        vertical: true,
        setup: (self) => {
            self.hook(runner_query_result, () => {
                self.children = [
                    ...runner_query_result.getValue().map((r) =>
                        Widget.Button({
                            class_name: "resultItem",
                            child: Widget.Label({ label: r }),
                            on_clicked: () => {
                                runner_selected_result.setValue([r])
                            },
                        })
                    ),
                ]
            })

            self.hook(runner_selected_result, () => {
                if (runner_selected_result.getValue().length < 1) {
                    return
                }

                console.log(
                    "selected: ",
                    runner_selected_result.getValue().join(", ")
                )

                self.children = [
                    Widget.Box({
                        spacing: 8,
                        vertical: true,
                        child: Widget.Label({
                            label: "Add SSH Key",
                        }),
                    }),
                    Widget.Entry({
                        class_name: "input",
                        placeholder_text: "Enter SSH Key",
                        on_accept: (pass) => {
                            console.log("accept")

                            Utils.execAsync([
                                "bash",
                                "-c",
                                `${App.configDir}/scripts/sshAgent.sh add ${runner_selected_result.getValue()} "${pass.text}"`,
                            ])
                                .then((r) => {
                                    console.log("ssh-add", r)
                                    show_runner.setValue(false)
                                    runner_mode.setValue("none")
                                })
                                .catch((error) => {
                                    console.log("error: ", error)

                                    self.children = [
                                        Widget.Box({
                                            spacing: 8,
                                            vertical: true,
                                            child: Widget.Label({
                                                label: "Error: " + error,
                                            }),
                                        }),
                                    ]
                                })
                        },
                    }),
                ]
            })
        },
    })

export const Result = () =>
    Widget.Stack({
        children: {
            none: NoneResult(),
            web: WebResult(),
            shell: ShellResult(),
            apps: AppResult(),
            sshAgent: SshAgentResult(),
        },
        shown: runner_mode.bind(),
    })

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
