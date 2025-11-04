import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"

interface Monitor {
    id: number
    name: string
    width: number
    height: number
    x: number
    y: number
    scale: number
    focused: boolean
}

async function getMonitors(): Promise<Monitor[]> {
    try {
        const output = await execAsync("hyprctl monitors -j")
        return JSON.parse(output)
    } catch (err) {
        console.error("Failed to get monitors:", err)
        return []
    }
}

function MonitorCanvas({ monitors }: { monitors: Monitor[] }) {
    if (monitors.length === 0) {
        return (
            <box css="padding: 32px;">
                <label label="No monitors found" />
            </box>
        )
    }

    // Calculate bounding box of all monitors (using effective dimensions with scale applied)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    monitors.forEach(mon => {
        const effectiveWidth = mon.width / mon.scale
        const effectiveHeight = mon.height / mon.scale
        minX = Math.min(minX, mon.x)
        minY = Math.min(minY, mon.y)
        maxX = Math.max(maxX, mon.x + effectiveWidth)
        maxY = Math.max(maxY, mon.y + effectiveHeight)
    })

    const totalWidth = maxX - minX
    const totalHeight = maxY - minY

    // Scale factor to fit in a reasonable canvas size (e.g., 800x600)
    const targetWidth = 800
    const targetHeight = 600
    const scaleX = targetWidth / totalWidth
    const scaleY = targetHeight / totalHeight
    const scale = Math.min(scaleX, scaleY) * 0.8 // 0.8 for some padding

    return (
        <box css={`padding: 32px; min-width: ${targetWidth + 64}px; min-height: ${targetHeight + 64}px;`}>
            <Gtk.Fixed
                $={(fixed) => {
                    monitors.forEach(mon => {
                        const effectiveWidth = mon.width / mon.scale
                        const effectiveHeight = mon.height / mon.scale
                        const scaledX = (mon.x - minX) * scale
                        const scaledY = (mon.y - minY) * scale
                        const scaledWidth = effectiveWidth * scale
                        const scaledHeight = effectiveHeight * scale

                        const monitorBox = (
                            <box
                                orientation={Gtk.Orientation.VERTICAL}
                                spacing={4}
                                class={mon.focused ? "monitor-box focused" : "monitor-box"}
                                css={`
                                    min-width: ${scaledWidth - 16}px;
                                    min-height: ${scaledHeight - 16}px;
                                `}
                            >
                                <label
                                    label={mon.name}
                                    css="font-weight: bold; font-size: 12px;"
                                    halign={Gtk.Align.CENTER}
                                />
                                <label
                                    label={`${mon.width}x${mon.height}`}
                                    css="font-size: 10px; opacity: 0.8;"
                                    halign={Gtk.Align.CENTER}
                                />
                                <label
                                    label={`@ ${mon.x},${mon.y}`}
                                    css="font-size: 9px; opacity: 0.6;"
                                    halign={Gtk.Align.CENTER}
                                />
                                {mon.scale !== 1 && (
                                    <label
                                        label={`Scale: ${mon.scale}x`}
                                        css="font-size: 9px; opacity: 0.6;"
                                        halign={Gtk.Align.CENTER}
                                    />
                                )}
                            </box>
                        ) as any

                        fixed.put(monitorBox, scaledX, scaledY)
                    })
                }}
            />
        </box>
    )
}

export default function MonitorSettings() {
    let settingsWindow: any
    let canvasBox: any
    let monitors: Monitor[] = []

    async function refreshMonitors() {
        monitors = await getMonitors()

        // Clear existing canvas
        if (canvasBox) {
            const children = canvasBox.observe_children()
            while (children.get_n_items() > 0) {
                const child = canvasBox.get_first_child()
                if (child) {
                    canvasBox.remove(child)
                }
            }

            // Add new canvas
            const canvas = <MonitorCanvas monitors={monitors} />
            canvasBox.append(canvas)
        }
    }

    // Global function to show monitor settings
    ;(globalThis as any).showMonitorSettings = async () => {
        if (settingsWindow) {
            await refreshMonitors()
            settingsWindow.show()
        }
    }

    return (
        <Gtk.Window
            visible={false}
            application={app}
            title="Monitor Settings"
            modal={false}
            defaultWidth={900}
            defaultHeight={700}
            onCloseRequest={(self) => {
                self.hide()
                return true
            }}
            $={(self) => {
                settingsWindow = self
            }}
        >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                {/* Header */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                    css="padding: 16px;"
                    class="overlay-dark"
                >
                    <label
                        label="Monitor Layout"
                        halign={Gtk.Align.START}
                        hexpand
                        css="font-size: 16px; font-weight: bold;"
                    />
                    <button
                        onClicked={refreshMonitors}
                        tooltipText="Refresh"
                    >
                        <image iconName="view-refresh-symbolic" />
                    </button>
                    <button
                        onClicked={() => settingsWindow?.hide()}
                        tooltipText="Close"
                    >
                        <image iconName="window-close-symbolic" />
                    </button>
                </box>

                {/* Canvas Container */}
                <scrolledwindow
                    hexpand
                    vexpand
                    hscrollPolicy={Gtk.ScrollablePolicy.AUTOMATIC}
                    vscrollPolicy={Gtk.ScrollablePolicy.AUTOMATIC}
                >
                    <box
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        $={(self) => {
                            canvasBox = self
                            // Load monitors on startup
                            refreshMonitors()
                        }}
                    />
                </scrolledwindow>
            </box>
        </Gtk.Window>
    )
}
