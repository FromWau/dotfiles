import { USER } from "resource:///com/github/Aylur/ags/utils.js"
import icons from "libs/icons"
import {
    ssh_agent_status,
    runner_mode,
    runner_query_result,
    show_runner,
} from "libs/variables"

const ok = () =>
    Widget.Icon({
        icon: icons.sshAgent.ok,
    })

const nok = () =>
    Widget.Icon({
        icon: icons.sshAgent.nok,
    })

export const SshAgendIndicator = () =>
    Widget.Button({
        class_name: "bar-item",
        on_clicked: () => {
            Utils.execAsync(
                `fd . --base-directory /home/${USER}/.ssh/ --strip-cwd-prefix -E '*.pub' -E '*hosts*' -E 'config'`
            )
                .then((r) => {
                    const result: string[] = r
                        .split("\n")
                        .filter((e) => e !== "")

                    runner_query_result.setValue(result)
                    runner_mode.setValue("sshAgent")
                    show_runner.setValue(true)
                })
                .catch((error) => {
                    console.log("error: ", error)
                })
        },
        child: Widget.Box({
            setup: (self) =>
                self.hook(ssh_agent_status, (self) => {
                    const is_ok =
                        ssh_agent_status.getValue().split(":")[0] === "ok"
                    const msg = ssh_agent_status.getValue().split(":")[1]

                    self.child = is_ok ? ok() : nok()
                    self.tooltip_text = `${msg}`
                }),
        }),
    })
