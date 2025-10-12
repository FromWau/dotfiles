import { exec } from "ags/process"
import { createPoll } from "ags/time"
import { With } from "gnim"

function getGpuUsage() {
    const gpu = exec([
        "bash",
        "-c",
        `nvtop -s | jq '.[].gpu_util'`
    ])
    if (gpu === "null") return undefined

    const mem = exec([
        "bash",
        "-c",
        `nvtop -s | jq '.[].mem_util'`

    ])
    if (mem === "null") return undefined

    return `${gpu}%/${mem}%`
}

export default function Gpu() {
    const gpu = createPoll(undefined, (1).seconds, () => getGpuUsage())

    return <box>
        <With value={gpu}>
            {
                (gpu) => gpu !== undefined && <label label={`Gpu: ${gpu}`} />
            }
        </With>
    </box>
}
