import { exec } from "ags/process"
import { createPoll } from "ags/time"

function getCpuUsage() {
    return exec([
        "bash",
        "-c",
        `top -bn1 | grep "Cpu(s)" |awk '{printf "%.1f%%", 100 - $8}'`,
    ])
}

export default function Cpu() {
    const cpu = createPoll("", (1).seconds, () => getCpuUsage())

    return <box>
        <label label={cpu((it) => `Cpu: ${it}`)} />
    </box>
}
