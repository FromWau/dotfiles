import { exec } from "ags/process"
import { createPoll } from "ags/time"
import { Accessor } from "gnim"

function getRamUsage() {
    const memFree = exec([
        "bash",
        "-c",
        `free -m | awk '/Mem:/ {printf "%.1f GB", $4/1024}'`,
    ])

    const memAvailable = exec([
        "bash",
        "-c",
        `free -m | awk '/Mem:/ {printf "%.1f GB", $7/1024}'`,
    ])

    return `Free: ${memFree} / Available: ${memAvailable}`
}


export default function Ram() {
    const ram: Accessor<string> = createPoll("", (1).seconds, () => getRamUsage())

    return <box>
        <label label={ram((it) => `Ram: ${it}`)} />
    </box>
}
