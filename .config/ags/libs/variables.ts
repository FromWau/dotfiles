const POLLING_INTERVAL = 2000

export const date = Variable("", {
    poll: [POLLING_INTERVAL, "date '+%T - %a, %d. %_B(%m) %Y'"],
})

export const cpuUsage = Variable(0, {
    poll: [
        POLLING_INTERVAL,
        [
            "bash",
            "-c",
            "top -n1 -b | rg Cpu | awk '{printf \"%.2f\\n\", (100-$8)}'",
        ],
    ],
})

// Ram usage in GB
export const ramUsage = Variable(0, {
    poll: [
        POLLING_INTERVAL,
        "awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{printf \"%.2f\\n\", (t-a)/1024/1024}' /proc/meminfo",
    ],
})

export const ramPercentage = Variable(0, {
    poll: [
        POLLING_INTERVAL,
        "awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{printf \"%.2f\\n\", (t-a)/t*100}' /proc/meminfo",
    ],
})

// TODO: Can we get this from the hyprland service?
export const currentKeymap = Variable("Unknown", {
    poll: [
        POLLING_INTERVAL,
        [
            "bash",
            "-c",
            "hyprctl devices -j | jq '.keyboards[] | select(.main == true) | .active_keymap' -r",
        ],
    ],
})

export const show_media = Variable(false)

export const show_session = Variable(false)
