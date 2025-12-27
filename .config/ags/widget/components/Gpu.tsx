import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { With } from "gnim"
import "./../../utils/time.ts"

const GPU_POLL_INTERVAL = (2).seconds  // Increased from 1s to reduce CPU usage

interface GpuStats {
    gpuUtil: string | null
    memUtil: string | null
    gpuClock: string | null
    deviceName: string
}

async function getGpuUsage(): Promise<GpuStats | undefined> {
    try {
        const result = await execAsync([
            "bash",
            "-c",
            `nvtop -s 2>/dev/null | jq -r '.[0] | if . == null then "null" else "\\(.gpu_util // "null"),\\(.mem_util // "null"),\\(.gpu_clock // "null"),\\(.device_name)" end' 2>/dev/null || echo "null"`
        ])

        if (!result || result.trim() === "null" || result.trim() === "") {
            return undefined
        }

        const parts = result.trim().split(',')
        if (parts.length !== 4) {
            return undefined
        }

        const [gpuUtil, memUtil, gpuClock, deviceName] = parts
        return {
            gpuUtil: gpuUtil === "null" ? null : gpuUtil,
            memUtil: memUtil === "null" ? null : memUtil,
            gpuClock: gpuClock === "null" ? null : gpuClock,
            deviceName: deviceName || "GPU"
        }
    } catch (e) {
        // Silently handle errors - GPU monitoring is not critical
        return undefined
    }
}

export default function Gpu() {
    const gpu = createPoll(undefined, GPU_POLL_INTERVAL, () => getGpuUsage())

    return <box class="gpu-widget">
        <With value={gpu}>
            {
                (gpu) => gpu !== undefined && (
                    <box spacing={8}>
                        {gpu.gpuUtil !== null && <label label={`GPU: ${gpu.gpuUtil}`} />}
                        {gpu.memUtil !== null && <label label={`VRAM: ${gpu.memUtil}`} />}
                        {gpu.gpuUtil === null && gpu.gpuClock !== null && <label label={`GPU: ${gpu.gpuClock}`} />}
                    </box>
                )
            }
        </With>
    </box>
}
