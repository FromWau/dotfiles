import { exec } from "ags/process"
import { createPoll } from "ags/time"
import "./../../utils/time.ts"

const CPU_POLL_INTERVAL = (1).seconds

function getCpuUsage() {
    return exec([
        "bash",
        "-c",
        `top -bn1 | grep "Cpu(s)" |awk '{printf "%.1f%%", 100 - $8}'`,
    ])
}

export default function Cpu() {
    const cpu = createPoll("", CPU_POLL_INTERVAL, () => getCpuUsage())

    return <box>
        <label label={cpu((it) => `Cpu: ${it}`)} />
    </box>
}
