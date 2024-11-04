import { Application } from "types/service/applications"

const POLLING_INTERVAL = 2000

export const date = Variable("", {
    poll: [POLLING_INTERVAL, "date '+%T;%a, %d. %_B(%m) %Y'"],
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

export const ssh_agent_status = Variable("error:internal-error", {
    poll: [
        POLLING_INTERVAL,
        ["bash", "-c", `${App.configDir}/scripts/sshAgent.sh status`],
    ],
})

export const is_scaled = Variable(false, {
    poll: [
        POLLING_INTERVAL,
        [
            "bash",
            "-c",
            `fd --base-directory "$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/temp/monitors" is_scaled -x cat | uniq | sort | head -1`,
        ],
        (out) => out === "true",
    ],
})

export const runner_mode = Variable<
    "none" | "web" | "shell" | "apps" | "sshAgent" | "location"
>("none")

export const runner_ssh_query_result = Variable<string[]>([])
export const runner_apps_query_result = Variable<Application[]>([])

type City = {
    name: string
    latitude: number
    longitude: number
    elevation: number
    population: number
    country: string
    timezone: string
}
export const runner_location = Variable<
    undefined | City | "unavailable" | "searching"
>(undefined)

export const runner_ssh_selected_result = Variable<string[]>([])
export const runner_apps_selected_result = Variable<Application[]>([])

export const show_media = Variable(false)

export const show_session = Variable(false)

export const show_runner = Variable(false)
