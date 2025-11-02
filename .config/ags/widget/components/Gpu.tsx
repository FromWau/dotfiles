import { exec } from "ags/process"
import { createPoll } from "ags/time"
import { With } from "gnim"
import "./../../utils/time.ts"

const GPU_POLL_INTERVAL = (1).seconds

interface GpuStats {
    gpuUtil: string
    memUtil: string
}

function getGpuUsage(): GpuStats | undefined {
    const result = exec([
        "bash",
        "-c",
        `nvtop -s | jq -r '.[0] | if . == null then "null" else "\\(.gpu_util),\\(.mem_util)" end'`
    ])
    if (result === "null") return undefined

    const [gpuUtil, memUtil] = result.split(',')
    return { gpuUtil, memUtil }
}

export default function Gpu() {
    const gpu = createPoll(undefined, GPU_POLL_INTERVAL, () => getGpuUsage())

    return <box>
        <With value={gpu}>
            {
                (gpu) => gpu !== undefined && (
                    <box spacing={8}>
                        <label label={`GPU: ${gpu.gpuUtil}`} />
                        <label label={`VRAM: ${gpu.memUtil}`} />
                    </box>
                )
            }
        </With>
    </box>
}
