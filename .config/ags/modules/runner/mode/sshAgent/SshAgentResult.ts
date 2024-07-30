import {
    runner_mode,
    runner_ssh_query_result,
    runner_ssh_selected_result,
    show_runner,
} from "libs/variables"
import { RunnerResultContainer } from "modules/runner/Result"

export const SshAgentRunnerResultContiner = ({
    on_selected,
}: {
    on_selected: (self: Box<Gtk.Widget, unknown>) => void
}) =>
    RunnerResultContainer({
        setup: (self) => {
            self.hook(runner_ssh_query_result, () => {
                self.children = [
                    ...runner_ssh_query_result.getValue().map((r) =>
                        Widget.Button({
                            class_name: "resultItem",
                            child: Widget.Label({ label: r }),
                            on_clicked: () =>
                                runner_ssh_selected_result.setValue([r]),
                        })
                    ),
                ]
            })

            self.hook(runner_ssh_selected_result, () => {
                on_selected(self)
            })
        },
    })

export const SshAgentResult = () =>
    SshAgentRunnerResultContiner({
        on_selected: (self) => {
            if (runner_ssh_selected_result.getValue().length < 1) {
                return
            }

            self.children = [
                Widget.Box({
                    class_name: "resultItem",
                    spacing: 8,
                    vertical: true,
                    child: Widget.Label({
                        label: `Enter passphrase for ${runner_ssh_selected_result.getValue()}`,
                    }),
                }),
                Widget.Entry({
                    class_name: "input",
                    placeholder_text: "Enter passphrase",
                    on_accept: (pass) =>
                        Utils.execAsync([
                            "bash",
                            "-c",
                            `${App.configDir}/scripts/sshAgent.sh add ${runner_ssh_selected_result.getValue()} "${pass.text}"`,
                        ])
                            .then(() => {
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
                            }),
                }).keybind("Escape", () => show_runner.setValue(false)),
            ]
        },
    })
