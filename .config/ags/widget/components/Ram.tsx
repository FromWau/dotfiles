import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { Accessor } from "gnim"
import "./../../utils/time.ts"

const RAM_POLL_INTERVAL = (2).seconds  // Increased from 1s to reduce CPU usage

async function getRamUsage() {
    return execAsync([
        "bash",
        "-c",
        `free -m | awk '/Mem:/ {printf "Free: %.1f GB / Available: %.1f GB", $4/1024, $7/1024}'`,
    ])
}


export default function Ram() {
    const ram: Accessor<string> = createPoll("", RAM_POLL_INTERVAL, () => getRamUsage())

    return <box>
        <label label={ram((it) => `Ram: ${it}`)} />
    </box>
}
