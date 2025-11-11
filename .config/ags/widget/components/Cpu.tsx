import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import "./../../utils/time.ts"

const CPU_POLL_INTERVAL = (2).seconds  // Increased from 1s to reduce CPU usage

async function getCpuUsage() {
    return execAsync([
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
