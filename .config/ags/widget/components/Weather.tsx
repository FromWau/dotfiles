import "./../../utils/time.ts"
import GLib from "gi://GLib"
import { Accessor, With } from "gnim"
import { createPoll } from "ags/time"
import { fetch, URL } from "ags/fetch"
import { readFile } from "ags/file"
import { Gtk } from "ags/gtk4"

const configDir = GLib.get_user_config_dir() + "/ags"

const WEATHER_POLL_INTERVAL = (5).minutes

interface WeatherData {
    current: {
        temperature: number
        weatherCode: number
        windSpeed: number
        precipitation: number
    }
    hourly: Array<{
        time: string
        temperature: number
        weatherCode: number
        precipitation: number
    }>
    daily: Array<{
        date: string
        tempMax: number
        tempMin: number
        weatherCode: number
        precipitation: number
    }>
    unit: string
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
function getWeatherInfo(code: number): { icon: string; description: string } {
    if (code === 0) return { icon: "weather-clear-symbolic", description: "Clear sky" }
    if (code === 1) return { icon: "weather-few-clouds-symbolic", description: "Mainly clear" }
    if (code === 2) return { icon: "weather-few-clouds-symbolic", description: "Partly cloudy" }
    if (code === 3) return { icon: "weather-overcast-symbolic", description: "Overcast" }
    if (code === 45 || code === 48) return { icon: "weather-fog-symbolic", description: "Foggy" }
    if (code === 51 || code === 53 || code === 55) return { icon: "weather-showers-scattered-symbolic", description: "Drizzle" }
    if (code === 56 || code === 57) return { icon: "weather-showers-scattered-symbolic", description: "Freezing drizzle" }
    if (code === 61) return { icon: "weather-showers-symbolic", description: "Light rain" }
    if (code === 63) return { icon: "weather-showers-symbolic", description: "Moderate rain" }
    if (code === 65) return { icon: "weather-showers-symbolic", description: "Heavy rain" }
    if (code === 66 || code === 67) return { icon: "weather-showers-symbolic", description: "Freezing rain" }
    if (code === 71 || code === 73 || code === 75) return { icon: "weather-snow-symbolic", description: "Snowfall" }
    if (code === 77) return { icon: "weather-snow-symbolic", description: "Snow grains" }
    if (code === 80 || code === 81 || code === 82) return { icon: "weather-showers-symbolic", description: "Rain showers" }
    if (code === 85 || code === 86) return { icon: "weather-snow-symbolic", description: "Snow showers" }
    if (code === 95) return { icon: "weather-storm-symbolic", description: "Thunderstorm" }
    if (code === 96 || code === 99) return { icon: "weather-storm-symbolic", description: "Thunderstorm with hail" }
    return { icon: "weather-severe-alert-symbolic", description: "Unknown" }
}

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
        url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m,precipitation")
        url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation")
        url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum")
        url.searchParams.set("timezone", timezone)
        url.searchParams.set("forecast_days", "7")
        return url.toString()
    } catch (err) {
        console.error("Failed to build weather URL from config:", err)
        return undefined
    }
}

const weatherUrl = buildUrlFromConfig()

async function fetchWeather(): Promise<WeatherData | undefined> {
    try {
        if (!weatherUrl) return undefined
        const res = await fetch(weatherUrl)
        if (!res.ok) return undefined
        const json = await res.json()

        const current = {
            temperature: json?.current?.temperature_2m,
            weatherCode: json?.current?.weather_code ?? 0,
            windSpeed: json?.current?.wind_speed_10m ?? 0,
            precipitation: json?.current?.precipitation ?? 0,
        }

        const daily = json?.daily?.time?.map((date: string, i: number) => ({
            date,
            tempMax: json.daily.temperature_2m_max[i],
            tempMin: json.daily.temperature_2m_min[i],
            weatherCode: json.daily.weather_code[i],
            precipitation: json.daily.precipitation_sum[i],
        })) ?? []

        const unit = json?.current_units?.temperature_2m ?? "°C"

        return { current, daily, unit }
    } catch (err) {
        console.error("Failed to fetch weather:", err)
        return undefined
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"

    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function WeatherPopover({ weather }: { weather: WeatherData }) {
    const currentWeather = getWeatherInfo(weather.current.weatherCode)

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} css="padding: 8px; min-width: 280px;">
            <label label="Weather" halign={Gtk.Align.START} css="font-weight: bold;" />

            {/* Current Weather */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="padding: 8px; border-radius: 6px;" class="overlay-light">
                <box spacing={8}>
                    <image iconName={currentWeather.icon} css="font-size: 32px;" />
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                        <label
                            label={`${weather.current.temperature}${weather.unit}`}
                            halign={Gtk.Align.START}
                            css="font-size: 24px; font-weight: bold;"
                        />
                        <label
                            label={currentWeather.description}
                            halign={Gtk.Align.START}
                            css="opacity: 0.7;"
                        />
                    </box>
                </box>

                <box spacing={12} css="margin-top: 4px;">
                    <label
                        label={`💨 ${weather.current.windSpeed} km/h`}
                        css="font-size: 11px; opacity: 0.7;"
                    />
                    <label
                        label={`💧 ${weather.current.precipitation} mm`}
                        css="font-size: 11px; opacity: 0.7;"
                    />
                </box>
            </box>

            {/* Forecast */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                <label
                    label="7-Day Forecast"
                    halign={Gtk.Align.START}
                    css="font-size: 11px; opacity: 0.7; margin-top: 4px; font-weight: bold;"
                />
                {weather.daily.map((day) => {
                    const info = getWeatherInfo(day.weatherCode)
                    return (
                        <box spacing={8} css="padding: 6px; border-radius: 4px;" class="overlay-light-subtle">
                            <label
                                label={formatDate(day.date)}
                                halign={Gtk.Align.START}
                                hexpand
                                css="font-size: 11px; min-width: 80px;"
                            />
                            <image iconName={info.icon} />
                            <label
                                label={`${Math.round(day.tempMax)}° / ${Math.round(day.tempMin)}°`}
                                css="font-size: 11px; min-width: 60px;"
                            />
                            <label
                                label={day.precipitation > 0 ? `💧 ${day.precipitation}mm` : ""}
                                css="font-size: 10px; opacity: 0.6; min-width: 50px;"
                            />
                        </box>
                    )
                })}
            </box>

            {/* Settings Button */}
            <button
                onClicked={() => {
                    ;(globalThis as any).showSettings?.()
                }}
                css="margin-top: 8px;"
            >
                <label label="⚙️ Settings" />
            </button>
        </box>
    )
}

export default function Weather() {
    const weather: Accessor<WeatherData | undefined> = createPoll(undefined, WEATHER_POLL_INTERVAL, () => fetchWeather())
    let popoverRef: any

    return (
        <menubutton
            class="weather-widget"
            tooltipText="Weather"
            $={(self) => {
                popoverRef = self.get_popover()
            }}
        >
            <With value={weather}>
                {(data) => data ? (
                    <box spacing={4}>
                        <image iconName={getWeatherInfo(data.current.weatherCode).icon} />
                        <label label={`${data.current.temperature}${data.unit}`} />
                    </box>
                ) : (
                    <label label="Loading..." />
                )}
            </With>
            <popover>
                <With value={weather}>
                    {(data) => data ? (
                        <WeatherPopover weather={data} />
                    ) : (
                        <label label="Loading weather..." css="padding: 16px;" />
                    )}
                </With>
            </popover>
        </menubutton>
    )
}
