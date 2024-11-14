import icons from "libs/icons"
import { ssh_agent_status } from "libs/variables"
import { querySshAgentKeys } from "modules/runner/mode/sshAgent/QuerySshAgent"

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
        on_clicked: () => querySshAgentKeys(""),
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
