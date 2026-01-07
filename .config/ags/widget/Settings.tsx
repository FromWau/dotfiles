import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"
import { readFile, writeFile } from "ags/file"
import { fetch } from "ags/fetch"
import { exec, execAsync } from "ags/process"
import GLib from "gi://GLib"

const configDir = GLib.get_user_config_dir() + "/ags"
const configPath = `${configDir}/config.json`
const wallpaperDir = GLib.get_home_dir() + "/Pictures/wallpapers"

interface Config {
    weather?: {
        latitude?: number
        longitude?: number
        timezone?: string
        city?: string
    }
    theme?: {
        currentWallpaper?: string
        cursorTheme?: string
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

function getWallpapers(): string[] {
    try {
        const output = exec(`fd -e png -e jpg -e jpeg . ${wallpaperDir}`)
        return output.split('\n').filter(line => line.trim()).sort()
    } catch (err) {
        console.error("Failed to get wallpapers:", err)
        return []
    }
}

async function applyTheme(wallpaperPath: string): Promise<boolean> {
    try {
        console.log("Applying theme from wallpaper:", wallpaperPath)
        await execAsync(`matugen -v image "${wallpaperPath}"`)

        // Update wallpapers on all monitors
        const monitors = JSON.parse(exec('hyprctl monitors -j'))
        for (const monitor of monitors) {
            await execAsync(`swww img -o "${monitor.name}" "${wallpaperPath}" --transition-step 255 --transition-fps 90 --transition-type=any --transition-bezier .4,.04,.2,1`)
        }

        return true
    } catch (err) {
        console.error("Failed to apply theme:", err)
        return false
    }
}

function getCurrentCursorTheme(): string {
    try {
        const output = exec('gsettings get org.gnome.desktop.interface cursor-theme')
        return output.replace(/'/g, '').trim()
    } catch (err) {
        return "Unknown"
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

interface GpuInfo {
    pci: string
    name: string
    active: boolean
}

async function getGpuStatus(): Promise<GpuInfo[]> {
    try {
        const lspciRaw = await execAsync([
            "bash",
            "-c",
            "lspci -d 10de: | grep -i vga || echo ''"
        ])

        const activeGpusRaw = await execAsync([
            "bash",
            "-c",
            "nvidia-smi --query-gpu=pci.bus_id,name --format=csv,noheader 2>/dev/null || echo ''"
        ])

        const activePciIds = new Set<string>()
        if (activeGpusRaw.trim()) {
            activeGpusRaw.trim().split("\n").forEach(line => {
                const pciId = line.split(",")[0].trim()
                    .replace(/^00000000:/, "")
                    .replace(/^0000:/, "")
                activePciIds.add(pciId)
            })
        }

        const gpus: GpuInfo[] = []

        if (lspciRaw.trim()) {
            lspciRaw.trim().split("\n").forEach(line => {
                if (!line.trim()) return

                const pci = line.split(" ")[0]
                const name = line.substring(line.indexOf(" ") + 1)
                    .replace("VGA compatible controller: NVIDIA Corporation ", "")
                    .trim()

                gpus.push({
                    pci,
                    name,
                    active: activePciIds.has(pci)
                })
            })
        }

        return gpus
    } catch (e) {
        console.error("Error getting GPU status:", e)
        return []
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
    let wallpaperDropdown: any
    let themeStatusLabel: any
    let cursorThemeLabel: any
    let applyThemeButton: any
    let gpuListBox: any
    let gpuStatusLabel: any
    let notebookRef: any

    let fetchedCoords: { latitude: number, longitude: number, timezone: string } | null = null
    const wallpapers = getWallpapers()

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

    async function handleApplyTheme() {
        const selectedIndex = wallpaperDropdown.selected
        if (selectedIndex < 0 || selectedIndex >= wallpapers.length) {
            themeStatusLabel.label = "❌ Please select a wallpaper"
            return
        }

        const wallpaperPath = wallpapers[selectedIndex]
        themeStatusLabel.label = "🎨 Applying theme..."
        applyThemeButton.sensitive = false

        const success = await applyTheme(wallpaperPath)

        if (success) {
            themeStatusLabel.label = "✅ Theme applied successfully!"
            cursorThemeLabel.label = `Current cursor: ${getCurrentCursorTheme()}`

            const newConfig: Config = {
                ...config,
                theme: {
                    currentWallpaper: wallpaperPath,
                    cursorTheme: getCurrentCursorTheme(),
                }
            }
            saveConfig(newConfig)
        } else {
            themeStatusLabel.label = "❌ Failed to apply theme"
        }

        applyThemeButton.sensitive = true
    }

    function handleRandomTheme() {
        if (wallpapers.length === 0) {
            themeStatusLabel.label = "❌ No wallpapers found"
            return
        }
        const randomIndex = Math.floor(Math.random() * wallpapers.length)
        wallpaperDropdown.selected = randomIndex
        handleApplyTheme()
    }

    async function refreshGpuList() {
        if (!gpuListBox || !gpuStatusLabel) return

        gpuStatusLabel.label = "🔄 Refreshing..."
        const gpus = await getGpuStatus()
        gpuStatusLabel.label = ""

        // Clear existing children
        let child = gpuListBox.get_first_child()
        while (child) {
            const next = child.get_next_sibling()
            gpuListBox.remove(child)
            child = next
        }

        if (gpus.length === 0) {
            const noGpuLabel = Gtk.Label.new("No NVIDIA GPUs detected")
            noGpuLabel.set_css_classes(["dim-label"])
            gpuListBox.append(noGpuLabel)
            return
        }

        const hasDisabled = gpus.some(g => !g.active)

        // Add "Enable All" button if there are disabled GPUs
        if (hasDisabled) {
            const enableBtn = Gtk.Button.new()
            enableBtn.set_hexpand(true)

            const btnBox = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 8)
            const btnIcon = Gtk.Image.new_from_icon_name("view-refresh-symbolic")
            const btnLabel = Gtk.Label.new("Enable All GPUs")
            btnBox.append(btnIcon)
            btnBox.append(btnLabel)
            enableBtn.set_child(btnBox)

            enableBtn.connect("clicked", async () => {
                try {
                    gpuStatusLabel.label = "🔄 Enabling all GPUs..."
                    const result = await execAsync(["pkexec", "/home/fromml/Projects/dotfiles/.local/bin/gpu-enable"])
                    console.log("GPU enable result:", result)

                    // Check if no GPUs needed enabling
                    if (result.includes("No drained NVIDIA GPUs found")) {
                        gpuStatusLabel.label = "✅ All GPUs already enabled"
                    } else {
                        gpuStatusLabel.label = "✅ All GPUs enabled!"
                    }
                    setTimeout(() => refreshGpuList(), 2000)
                } catch (e) {
                    console.error("Error enabling GPUs:", e)
                    const errorMsg = e instanceof Error && e.message
                        ? e.message
                        : String(e) || "Unknown error occurred"
                    gpuStatusLabel.label = `❌ Failed: ${errorMsg}`
                }
            })

            const enableBox = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 8)
            enableBox.set_css_classes(["enable-all-box"])
            enableBox.append(enableBtn)
            gpuListBox.append(enableBox)
        }

        // Add each GPU
        gpus.forEach(gpu => {
            const gpuContainer = Gtk.Box.new(Gtk.Orientation.VERTICAL, 4)
            gpuContainer.set_css_classes(["gpu-item"])

            // Header with name and status
            const headerBox = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 8)
            const nameLabel = Gtk.Label.new(gpu.name)
            nameLabel.set_halign(Gtk.Align.START)
            nameLabel.set_hexpand(true)
            nameLabel.set_css_classes(["gpu-name"])

            const statusLabel = Gtk.Label.new(gpu.active ? "Active" : "Disabled")
            statusLabel.set_css_classes(gpu.active ? ["gpu-active"] : ["gpu-disabled"])

            headerBox.append(nameLabel)
            headerBox.append(statusLabel)
            gpuContainer.append(headerBox)

            // PCI address
            const pciLabel = Gtk.Label.new(`PCI: ${gpu.pci}`)
            pciLabel.set_halign(Gtk.Align.START)
            pciLabel.set_css_classes(["gpu-pci"])
            gpuContainer.append(pciLabel)

            // Disable button for active GPUs
            if (gpu.active) {
                const disableBtn = Gtk.Button.new()
                const disableBtnBox = Gtk.Box.new(Gtk.Orientation.HORIZONTAL, 8)
                const disableBtnIcon = Gtk.Image.new_from_icon_name("process-stop-symbolic")
                const disableBtnLabel = Gtk.Label.new("Disable GPU (will restart session)")
                disableBtnBox.append(disableBtnIcon)
                disableBtnBox.append(disableBtnLabel)
                disableBtn.set_child(disableBtnBox)
                disableBtn.set_css_classes(["destructive-action"])

                disableBtn.connect("clicked", async () => {
                    try {
                        const fullPci = `00000000:${gpu.pci}`
                        gpuStatusLabel.label = `🔄 Disabling ${gpu.name}...`
                        const result = await execAsync(["pkexec", "/home/fromml/Projects/dotfiles/.local/bin/gpu-disable", "-g", fullPci, "--yes"])
                        console.log("GPU disable result:", result)
                        gpuStatusLabel.label = "✅ GPU disabled, restarting session..."
                    } catch (e) {
                        console.error("Error disabling GPU:", e)
                        const errorMsg = e instanceof Error && e.message
                            ? e.message
                            : String(e) || "Unknown error occurred"
                        gpuStatusLabel.label = `❌ Failed: ${errorMsg}`
                    }
                })

                gpuContainer.append(disableBtn)
            }

            gpuListBox.append(gpuContainer)
        })
    }

    // Global function to show settings
    ;(globalThis as any).showSettings = (tab?: number) => {
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

            // Switch to requested tab
            if (tab !== undefined && notebookRef) {
                notebookRef.page = tab
            }

            // Refresh GPU list if opening GPU tab
            if (tab === 2) {
                refreshGpuList()
            }
        }
    }

    return (
        <Gtk.Window
            visible={false}
            application={app}
            title="AGS Settings"
            modal={true}
            defaultWidth={500}
            defaultHeight={400}
            onCloseRequest={(self) => {
                self.hide()
                return true
            }}
            $={(self) => {
                settingsWindow = self
            }}
        >
            <Gtk.Notebook
                css="padding: 8px;"
                $={(self) => {
                    notebookRef = self
                    // Weather tab
                    const weatherBox = (
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
                            css="margin-top: 8px; padding: 12px; border-radius: 8px;"
                            class="overlay-light"
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
                    ) as Gtk.Widget

                    // Theme tab
                    const themeBox = (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={16} css="padding: 24px;">
                    <label label="Theme Settings" css="font-size: 18px; font-weight: bold;" />

                    <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                            <label label="Select Wallpaper:" halign={Gtk.Align.START} />
                            <Gtk.DropDown
                                model={Gtk.StringList.new(wallpapers.map(p => GLib.path_get_basename(p)))}
                                selected={wallpapers.findIndex(w => w === config.theme?.currentWallpaper)}
                                $={(self) => {
                                    wallpaperDropdown = self
                                }}
                            />
                            <label
                                label={`Found ${wallpapers.length} wallpapers in ${wallpaperDir}`}
                                halign={Gtk.Align.START}
                                css="font-size: 11px; opacity: 0.6; margin-top: 4px;"
                            />
                        </box>

                        <box spacing={8}>
                            <button
                                hexpand
                                onClicked={handleApplyTheme}
                                $={(self) => {
                                    applyThemeButton = self
                                }}
                            >
                                <label label="🎨 Apply Theme" />
                            </button>
                            <button onClicked={handleRandomTheme}>
                                <label label="🎲 Random" />
                            </button>
                        </box>

                        <label
                            label=""
                            halign={Gtk.Align.START}
                            css="font-size: 12px; margin-top: 4px;"
                            $={(self) => {
                                themeStatusLabel = self
                            }}
                        />

                        {config.theme?.currentWallpaper && (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="margin-top: 8px;">
                                <label
                                    label="Currently applied:"
                                    halign={Gtk.Align.START}
                                    css="font-size: 12px; opacity: 0.7;"
                                />
                                <label
                                    label={`Wallpaper: ${GLib.path_get_basename(config.theme.currentWallpaper)}`}
                                    halign={Gtk.Align.START}
                                    css="font-size: 11px; opacity: 0.6;"
                                />
                            </box>
                        )}

                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="margin-top: 8px;">
                            <label
                                label={`Current cursor: ${getCurrentCursorTheme()}`}
                                halign={Gtk.Align.START}
                                css="font-size: 11px; opacity: 0.7;"
                                $={(self) => {
                                    cursorThemeLabel = self
                                }}
                            />
                            <label
                                label="Cursor theme updates automatically based on wallpaper colors"
                                halign={Gtk.Align.START}
                                css="font-size: 10px; opacity: 0.5;"
                            />
                        </box>
                    </box>

                    <box spacing={8} halign={Gtk.Align.END}>
                        <button onClicked={handleCancel}>
                            <label label="Close" />
                        </button>
                    </box>
                </box>
                    ) as Gtk.Widget

                    // GPU tab
                    const gpuBox = (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={16} css="padding: 24px;">
                            <label label="GPU Management" css="font-size: 18px; font-weight: bold;" />

                            <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                                <box spacing={8}>
                                    <button hexpand onClicked={refreshGpuList}>
                                        <box spacing={8}>
                                            <image iconName="view-refresh-symbolic" />
                                            <label label="Refresh GPU Status" />
                                        </box>
                                    </button>
                                </box>

                                <label
                                    label=""
                                    halign={Gtk.Align.START}
                                    css="font-size: 12px; margin-top: 4px;"
                                    $={(self) => {
                                        gpuStatusLabel = self
                                    }}
                                />

                                <box
                                    orientation={Gtk.Orientation.VERTICAL}
                                    spacing={0}
                                    css="border: 1px solid alpha(currentColor, 0.1); border-radius: 8px; overflow: hidden;"
                                    $={(self) => {
                                        gpuListBox = self
                                    }}
                                >
                                    <label label="Click Refresh to load GPUs" css="padding: 24px; opacity: 0.6;" />
                                </box>

                                <box orientation={Gtk.Orientation.VERTICAL} spacing={4} css="margin-top: 8px;">
                                    <label
                                        label="Note:"
                                        halign={Gtk.Align.START}
                                        css="font-size: 11px; opacity: 0.7; font-weight: bold;"
                                    />
                                    <label
                                        label="• Disabling a GPU will exit your Hyprland session"
                                        halign={Gtk.Align.START}
                                        css="font-size: 10px; opacity: 0.6;"
                                    />
                                    <label
                                        label="• Enabling GPUs does not require a session restart"
                                        halign={Gtk.Align.START}
                                        css="font-size: 10px; opacity: 0.6;"
                                    />
                                </box>
                            </box>

                            <box spacing={8} halign={Gtk.Align.END}>
                                <button onClicked={handleCancel}>
                                    <label label="Close" />
                                </button>
                            </box>
                        </box>
                    ) as Gtk.Widget

                    // Append pages to notebook
                    const weatherLabel = Gtk.Label.new("Weather")
                    const themeLabel = Gtk.Label.new("Theme")
                    const gpuLabel = Gtk.Label.new("GPU")
                    self.append_page(weatherBox, weatherLabel)
                    self.append_page(themeBox, themeLabel)
                    self.append_page(gpuBox, gpuLabel)
                }}
            />
        </Gtk.Window>
    )
}
