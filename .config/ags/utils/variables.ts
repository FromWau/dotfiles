import { Variable } from "astal"

export const time = Variable("").poll(1000, "date '+%T %a, %d. %_B(%m) %Y'")

export const cpuUsage = Variable("").poll(2000, [
    "bash",
    "-c",
    `top -bn1 | grep "Cpu(s)" |awk '{printf "%.1f%%", 100 - $8}'`,
])
export const memFree = Variable("").poll(2000, [
    "bash",
    "-c",
    `free -m | awk '/Mem:/ {printf "%.1f GB", $4/1024}'`,
])
export const memAvailable = Variable("").poll(2000, [
    "bash",
    "-c",
    `free -m | awk '/Mem:/ {printf "%.1f GB", $7/1024}'`,
])
