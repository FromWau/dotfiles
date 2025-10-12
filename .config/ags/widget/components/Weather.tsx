import "./../../utils/time.ts"
import GLib from "gi://GLib"
import { Accessor, With } from "gnim"
import { createPoll } from "ags/time"
import { fetch, URL } from "ags/fetch"
import { readFile } from "ags/file"

const configDir = GLib.get_user_config_dir() + "/ags"

function buildUrlFromConfig(): string {
    const url = new URL("https://api.open-meteo.com/v1/forecast")

    const config = JSON.parse(readFile(`${configDir}/config.json`))
    const { latitude, longitude, timezone } = config.weather

    url.searchParams.set("latitude", latitude)
    url.searchParams.set("longitude", longitude)
    url.searchParams.set("current", "temperature_2m")
    url.searchParams.set("timezone", timezone)
    return url.toString()
}

async function fetchTemp(): Promise<string | undefined> {
    const res = await fetch(buildUrlFromConfig())
    if (!res.ok) return undefined
    const json = await res.json()

    const temp = json?.current?.temperature_2m
    if (temp === undefined) return undefined

    const tempUnit = json?.current_units?.temperature_2m
    if (tempUnit === undefined) return undefined

    return `${temp}${tempUnit}`
}

export default function Weather() {
    const temp: Accessor<string | undefined> = createPoll(undefined, (5).minutes, () => fetchTemp())

    return (
        <box>
            <With value={temp}>
                {(temp) => <label label={temp} />}
            </With>
        </box>
    )
}
