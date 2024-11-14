import { CpuInfo } from "./cpu/CpuInfo"
import { RamInfo } from "./ram/RamInfo"

export const HardwareInfo = () =>
    Widget.Box({
        spacing: 8,
        children: [CpuInfo(), RamInfo()],
    })
