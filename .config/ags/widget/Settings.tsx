import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"
import { readFile, writeFile } from "ags/file"
import { fetch } from "ags/fetch"
import GLib from "gi://GLib"

const configDir = GLib.get_user_config_dir() + "/ags"
const configPath = `${configDir}/config.json`

interface Config {
    weather?: {
        latitude?: number
        longitude?: number
        timezone?: string
        city?: string
    }
}

function readConfig(): Config {
    try {
        return JSON.parse(readFile(configPath))
    } catch (err) {
        console.error("Failed to read config:", err)
        return {}
    }
}

function saveConfig(config: Config) {
    try {
        writeFile(configPath, JSON.stringify(config, null, "\t"))
        console.log("Config saved successfully")
    } catch (err) {
        console.error("Failed to save config:", err)
    }
}

async function geocodeCity(city: string): Promise<{ latitude: number, longitude: number, timezone: string } | undefined> {
    try {
        // Use Nominatim for geocoding
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
        const geocodeRes = await fetch(geocodeUrl, {
            headers: {
                'User-Agent': 'AGS-Weather-Widget/1.0'
            }
        })

        console.log("Geocode response status:", geocodeRes.status)

        if (!geocodeRes.ok) {
            console.error("Geocode request failed:", geocodeRes.status)
            return undefined
        }

        const geocodeData = await geocodeRes.json()
        console.log("Geocode data:", JSON.stringify(geocodeData))

        if (!geocodeData || geocodeData.length === 0) {
            console.error("No results found for city:", city)
            return undefined
        }

        const latitude = parseFloat(geocodeData[0].lat)
        const longitude = parseFloat(geocodeData[0].lon)

        console.log(`Found coordinates: ${latitude}, ${longitude}`)

        // Use timeapi.io to get timezone from coordinates
        const timezoneUrl = `https://timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
        const timezoneRes = await fetch(timezoneUrl)

        console.log("Timezone response status:", timezoneRes.status)

        if (!timezoneRes.ok) {
            console.error("Timezone request failed:", timezoneRes.status)
            return undefined
        }

        const timezoneData = await timezoneRes.json()
        console.log("Timezone data:", JSON.stringify(timezoneData))

        const timezone = timezoneData?.timeZone

        if (!timezone) {
            console.error("No timezone found in response")
            return undefined
        }

        return { latitude, longitude, timezone }
    } catch (err) {
        console.error("Geocoding failed:", err)
        return undefined
    }
}

export default function Settings() {
    const config = readConfig()

    let cityEntry: any
    let statusLabel: any
    let previewBox: any
    let latLabel: any
    let lonLabel: any
    let tzLabel: any
    let saveButton: any
    let settingsWindow: any

    let fetchedCoords: { latitude: number, longitude: number, timezone: string } | null = null

    async function handleLookup() {
        const city = cityEntry.text.trim()
        if (!city) {
            statusLabel.label = "❌ Please enter a city name"
            previewBox.visible = false
            saveButton.sensitive = false
            return
        }

        statusLabel.label = "🔍 Looking up coordinates..."
        previewBox.visible = false
        saveButton.sensitive = false

        const coords = await geocodeCity(city)

        if (!coords) {
            statusLabel.label = "❌ Could not find city. Try a different name."
            previewBox.visible = false
            saveButton.sensitive = false
            return
        }

        fetchedCoords = coords
        statusLabel.label = "✅ City found! Review and click Save to confirm."

        latLabel.label = `Latitude: ${coords.latitude.toFixed(4)}`
        lonLabel.label = `Longitude: ${coords.longitude.toFixed(4)}`
        tzLabel.label = `Timezone: ${coords.timezone}`

        previewBox.visible = true
        saveButton.sensitive = true
    }

    function handleSave() {
        if (!fetchedCoords) {
            statusLabel.label = "❌ Please lookup a city first"
            return
        }

        const city = cityEntry.text.trim()
        const newConfig: Config = {
            ...config,
            weather: {
                city: city,
                latitude: fetchedCoords.latitude,
                longitude: fetchedCoords.longitude,
                timezone: fetchedCoords.timezone,
            }
        }
        saveConfig(newConfig)
        statusLabel.label = "✅ Settings saved successfully!"

        setTimeout(() => {
            settingsWindow.hide()
        }, 1000)
    }

    function handleCancel() {
        settingsWindow.hide()
    }

    // Global function to show settings
    ;(globalThis as any).showSettings = () => {
        if (settingsWindow) {
            settingsWindow.show()
            if (statusLabel) {
                statusLabel.label = ""
            }
            if (previewBox) {
                previewBox.visible = false
            }
            if (saveButton) {
                saveButton.sensitive = false
            }
            fetchedCoords = null
        }
    }

    return (
        <Gtk.Window
            visible={false}
            application={app}
            title="AGS Weather Settings"
            modal={true}
            defaultWidth={400}
            defaultHeight={300}
            onCloseRequest={(self) => {
                self.hide()
                return true
            }}
            $={(self) => {
                settingsWindow = self
            }}
        >
                <box orientation={Gtk.Orientation.VERTICAL} spacing={16} css="padding: 24px;">
                    <label label="Weather Settings" css="font-size: 18px; font-weight: bold;" />

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <label label="City:" halign={Gtk.Align.START} />
                            <box spacing={8}>
                                <entry
                                    hexpand
                                    text={config.weather?.city ?? ""}
                                    placeholderText="e.g. Vienna, Austria"
                                    onActivate={handleLookup}
                                    $={(self) => {
                                        cityEntry = self
                                    }}
                                />
                                <button onClicked={handleLookup}>
                                    <label label="🔍 Lookup" />
                                </button>
                            </box>
                            <label
                                label=""
                                halign={Gtk.Align.START}
                                css="font-size: 12px; margin-top: 4px;"
                                $={(self) => {
                                    statusLabel = self
                                }}
                            />
                        </box>

                        <box
                            visible={false}
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={4}
                            css="margin-top: 8px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;"
                            $={(self) => {
                                previewBox = self
                            }}
                        >
                            <label
                                label="Preview:"
                                halign={Gtk.Align.START}
                                css="font-size: 12px; font-weight: bold;"
                            />
                            <label
                                label=""
                                halign={Gtk.Align.START}
                                css="font-size: 11px;"
                                $={(self) => {
                                    latLabel = self
                                }}
                            />
                            <label
                                label=""
                                halign={Gtk.Align.START}
                                css="font-size: 11px;"
                                $={(self) => {
                                    lonLabel = self
                                }}
                            />
                            <label
                                label=""
                                halign={Gtk.Align.START}
                                css="font-size: 11px;"
                                $={(self) => {
                                    tzLabel = self
                                }}
                            />
                        </box>

                        {config.weather?.latitude && config.weather?.longitude && config.weather?.timezone && (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="margin-top: 8px;">
                                <label
                                    label="Currently saved:"
                                    halign={Gtk.Align.START}
                                    css="font-size: 12px; opacity: 0.7;"
                                />
                                <label
                                    label={`${config.weather.city ?? "Unknown"}`}
                                    halign={Gtk.Align.START}
                                    css="font-size: 11px; opacity: 0.6;"
                                />
                                <label
                                    label={`Lat: ${config.weather.latitude.toFixed(4)}, Lon: ${config.weather.longitude.toFixed(4)}`}
                                    halign={Gtk.Align.START}
                                    css="font-size: 11px; opacity: 0.6;"
                                />
                                <label
                                    label={`Timezone: ${config.weather.timezone}`}
                                    halign={Gtk.Align.START}
                                    css="font-size: 11px; opacity: 0.6;"
                                />
                            </box>
                        )}
                    </box>

                    <box spacing={8} halign={Gtk.Align.END}>
                        <button onClicked={handleCancel}>
                            <label label="Cancel" />
                        </button>
                        <button
                            sensitive={false}
                            onClicked={handleSave}
                            $={(self) => {
                                saveButton = self
                            }}
                        >
                            <label label="Save" />
                        </button>
                    </box>
                </box>
        </Gtk.Window>
    )
}
