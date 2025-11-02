import "./../../utils/time.ts"
import GLib from "gi://GLib"
import { Accessor, With } from "gnim"
import { createPoll } from "ags/time"
import { fetch, URL } from "ags/fetch"
import { readFile } from "ags/file"

const configDir = GLib.get_user_config_dir() + "/ags"

const WEATHER_POLL_INTERVAL = (5).minutes

function buildUrlFromConfig(): string | undefined {
    try {
        const url = new URL("https://api.open-meteo.com/v1/forecast")

        const config = JSON.parse(readFile(`${configDir}/config.json`))
        const { latitude, longitude, timezone } = config?.weather ?? {}

        if (!latitude || !longitude || !timezone) {
            console.error("Weather config missing required fields: latitude, longitude, or timezone")
            return undefined
        }

        url.searchParams.set("latitude", latitude)
        url.searchParams.set("longitude", longitude)
        url.searchParams.set("current", "temperature_2m")
        url.searchParams.set("timezone", timezone)
        return url.toString()
    } catch (err) {
        console.error("Failed to build weather URL from config:", err)
        return undefined
    }
}

const weatherUrl = buildUrlFromConfig()

async function fetchTemp(): Promise<string | undefined> {
    if (!weatherUrl) return undefined
    const res = await fetch(weatherUrl)
    if (!res.ok) return undefined
    const json = await res.json()

    const temp = json?.current?.temperature_2m
    if (temp === undefined) return undefined

    const tempUnit = json?.current_units?.temperature_2m
    if (tempUnit === undefined) return undefined

    return `${temp}${tempUnit}`
}

export default function Weather() {
    const temp: Accessor<string | undefined> = createPoll(undefined, WEATHER_POLL_INTERVAL, () => fetchTemp())

    return (
        <box>
            <With value={temp}>
                {(temp) => <label label={temp ?? "Loading..."} />}
            </With>
        </box>
    )
}
