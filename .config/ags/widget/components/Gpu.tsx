import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { With } from "gnim"
import "./../../utils/time.ts"

const GPU_POLL_INTERVAL = (2).seconds  // Increased from 1s to reduce CPU usage

interface GpuStats {
    gpuUtil: string
    memUtil: string
}

async function getGpuUsage(): Promise<GpuStats | undefined> {
    try {
        const result = await execAsync([
            "bash",
            "-c",
            `nvtop -s 2>/dev/null | jq -r '.[0] | if . == null then "null" else "\\(.gpu_util),\\(.mem_util)" end' 2>/dev/null || echo "null"`
        ])

        if (!result || result.trim() === "null" || result.trim() === "") {
            return undefined
        }

        const parts = result.trim().split(',')
        if (parts.length !== 2) {
            return undefined
        }

        const [gpuUtil, memUtil] = parts
        return { gpuUtil, memUtil }
    } catch (e) {
        // Silently handle errors - GPU monitoring is not critical
        return undefined
    }
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
