import AstalMpris from "gi://AstalMpris"
import AstalCava from "gi://AstalCava"
import { createBinding, createComputed, For, With } from "gnim"
import { Gtk } from "ags/gtk4"
import { onCleanup } from "ags"

const mpris = AstalMpris.get_default()

// Try creating with absolutely no parameters
let cava: AstalCava.Cava | null = null

try {
    const instance = new AstalCava.Cava()

    // Set properties after construction
    instance.bars = 12
    instance.framerate = 24  // Reduced from 60 to 24 FPS for better performance
    instance.autosens = true

    cava = instance
    console.log("Cava initialized successfully")
} catch (error) {
    console.error("Failed to initialize cava:", error)
    cava = null
}

function CavaVisualization() {
    if (!cava) {
        return <box css="min-width: 16px;" />
    }

    return (
        <drawingarea
            $={(self) => {
                const width = 48
                const height = 20

                self.set_size_request(width, height)

                // Cache color to avoid querying style context on every draw
                let cachedColor: { red: number; green: number; blue: number; alpha: number } | null = null

                const updateColor = () => {
                    const styleContext = self.get_style_context()
                    const color = styleContext.get_color()
                    cachedColor = { red: color.red, green: color.green, blue: color.blue, alpha: color.alpha }
                }

                updateColor()

                self.set_draw_func((_, cr, w, h) => {
                    const values = cava!.values
                    if (!values || values.length === 0 || !cachedColor) return

                    const barWidth = w / values.length

                    // Start path from bottom left
                    cr.moveTo(0, h)

                    // Draw smooth curve through values
                    for (let i = 0; i < values.length; i++) {
                        const x = i * barWidth
                        const y = h - (values[i] * h)
                        const nextX = (i + 1) * barWidth
                        const nextY = i < values.length - 1 ? h - (values[i + 1] * h) : y

                        if (i === 0) {
                            cr.lineTo(x, y)
                        }

                        // Draw cubic bezier curve to next point
                        const cp1x = x + barWidth / 2
                        const cp1y = y
                        const cp2x = nextX - barWidth / 2
                        const cp2y = nextY

                        cr.curveTo(cp1x, cp1y, cp2x, cp2y, nextX, nextY)
                    }

                    // Close path to bottom right and fill
                    cr.lineTo(w, h)
                    cr.closePath()

                    // Use cached color
                    cr.setSourceRGBA(cachedColor.red, cachedColor.green, cachedColor.blue, cachedColor.alpha * 0.8)
                    cr.fill()
                })

                // Subscribe to cava values changes
                cava!.connect("notify::values", () => {
                    self.queue_draw()
                })
            }}
            css="min-width: 48px; min-height: 20px;"
        />
    )
}

function formatTime(seconds: number): string {
    if (seconds < 0 || isNaN(seconds)) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, "0")}`
}

function getPlaybackIcon(status: AstalMpris.PlaybackStatus | undefined): string {
    switch (status) {
        case AstalMpris.PlaybackStatus.PLAYING:
            return "media-playback-pause-symbolic"
        case AstalMpris.PlaybackStatus.PAUSED:
            return "media-playback-start-symbolic"
        case AstalMpris.PlaybackStatus.STOPPED:
        default:
            return "media-playback-start-symbolic"
    }
}

function PlayerControls(player: AstalMpris.Player) {
    const title = createBinding(player, "title")
    const artist = createBinding(player, "artist")
    const playbackStatus = createBinding(player, "playbackStatus")
    const position = createBinding(player, "position")
    const length = createBinding(player, "length")
    const canGoNext = createBinding(player, "canGoNext")
    const canGoPrevious = createBinding(player, "canGoPrevious")
    const canPlay = createBinding(player, "canPlay")
    const canPause = createBinding(player, "canPause")
    const identity = createBinding(player, "identity")

    // Try artUrl first, fallback to coverArt
    const artUrl = createBinding(player, "artUrl")
    const coverArt = createBinding(player, "coverArt")

    // Process the art URL to handle file:// URLs
    const processedArt = createComputed([artUrl, coverArt], (url, cover) => {
        const art = url || cover
        if (!art) return null

        // Convert file:// URLs to regular paths
        if (art.startsWith("file://")) {
            return decodeURIComponent(art.substring(7))
        }
        return art
    })

    // Note: Position updates are handled reactively by MPRIS bindings
    // No manual polling needed as position binding auto-updates

    const handlePlayPause = () => {
        if (player.canPause && player.playbackStatus === AstalMpris.PlaybackStatus.PLAYING) {
            player.pause()
        } else if (player.canPlay) {
            player.play()
        }
    }

    const handlePrevious = () => {
        if (player.canGoPrevious) {
            player.previous()
        }
    }

    const handleNext = () => {
        if (player.canGoNext) {
            player.next()
        }
    }

    const handleSeek = (value: number) => {
        if (player.canSeek) {
            player.set_position(value)
        }
    }

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            css="padding: 12px; border-radius: 8px; min-width: 320px;"
            class="overlay-light"
        >
            {/* Player Identity */}
            <label
                label={identity}
                halign={Gtk.Align.START}
                css="font-size: 10px; opacity: 0.6; text-transform: uppercase; font-weight: bold;"
            />

            {/* Cover Art and Track Info */}
            <box spacing={12}>
                {/* Cover Art */}
                <box
                    css="min-width: 150px; min-height: 150px; max-width: 150px; max-height: 150px; border-radius: 8px; overflow: hidden;"
                    class="overlay-light"
                >
                    <With value={processedArt}>
                        {(art) => art ? (
                            <image
                                file={art}
                                pixelSize={150}
                                css="border-radius: 8px;"
                            />
                        ) : (
                            <image
                                iconName="music-note-symbolic"
                                pixelSize={64}
                                css="margin: auto; opacity: 0.3;"
                            />
                        )}
                    </With>
                </box>

                {/* Track Info */}
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2} valign={Gtk.Align.CENTER}>
                    <label
                        label={title.as(t => t || "No track")}
                        halign={Gtk.Align.START}
                        css="font-weight: bold; font-size: 13px;"
                        wrap
                        ellipsize={3}  // ELLIPSIZE_END
                        maxWidthChars={30}
                    />
                    <label
                        label={artist.as(a => a || "Unknown artist")}
                        halign={Gtk.Align.START}
                        css="opacity: 0.7; font-size: 11px;"
                        wrap
                        ellipsize={3}
                        maxWidthChars={30}
                    />
                </box>
            </box>

            {/* Seek Bar */}
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                <slider
                    drawValue={false}
                    min={0}
                    max={length.as(l => l || 1)}
                    value={position}
                    onChangeValue={(value) => handleSeek(value)}
                    hexpand
                />
                <box spacing={8}>
                    <label
                        label={position.as(p => formatTime(p))}
                        css="font-size: 10px; opacity: 0.6;"
                    />
                    <box hexpand />
                    <label
                        label={length.as(l => formatTime(l))}
                        css="font-size: 10px; opacity: 0.6;"
                    />
                </box>
            </box>

            {/* Playback Controls */}
            <box spacing={8} halign={Gtk.Align.CENTER}>
                <button
                    onClicked={handlePrevious}
                    sensitive={canGoPrevious}
                    css="min-width: 40px; min-height: 40px;"
                >
                    <image iconName="media-skip-backward-symbolic" />
                </button>
                <button
                    onClicked={handlePlayPause}
                    sensitive={createComputed([canPlay, canPause], (play, pause) => play || pause)}
                    css="min-width: 48px; min-height: 48px; font-size: 18px;"
                >
                    <image iconName={playbackStatus.as(getPlaybackIcon)} />
                </button>
                <button
                    onClicked={handleNext}
                    sensitive={canGoNext}
                    css="min-width: 40px; min-height: 40px;"
                >
                    <image iconName="media-skip-forward-symbolic" />
                </button>
            </box>
        </box>
    )
}

function MediaPlayerMenu(popover: any) {
    const players = createBinding(mpris, "players")

    // Filter out playerctl and other non-media players
    const filteredPlayers = createComputed([players], (p) => {
        if (!p) return []
        return p.filter(player => {
            const identity = player.identity?.toLowerCase() || ""
            const busName = player.busName?.toLowerCase() || ""
            // Filter out playerctl and playerctld
            return !identity.includes("playerctl") && !busName.includes("playerctl")
        })
    })

    const hasPlayers = createComputed([filteredPlayers], (p) => p && p.length > 0)

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} css="padding: 8px;">
            <label label="Media Players" halign={Gtk.Align.START} css="font-weight: bold;" />

            <With value={hasPlayers}>
                {(has) => has ? (
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                        <For each={filteredPlayers}>
                            {(player) => PlayerControls(player)}
                        </For>
                    </box>
                ) : (
                    <label
                        label="No media players available"
                        css="padding: 20px; opacity: 0.5;"
                    />
                )}
            </With>
        </box>
    )
}

export default function MediaPlayer(): Gtk.Widget {
    let popoverRef: any

    const players = createBinding(mpris, "players")

    // Filter out playerctl and other non-media players
    const filteredPlayers = createComputed([players], (p) => {
        if (!p) return []
        return p.filter(player => {
            const identity = player.identity?.toLowerCase() || ""
            const busName = player.busName?.toLowerCase() || ""
            // Filter out playerctl and playerctld
            return !identity.includes("playerctl") && !busName.includes("playerctl")
        })
    })

    const activePlayer = filteredPlayers.as(p => p?.[0])

    return (
        <menubutton
            $={(self) => {
                popoverRef = self.get_popover()
            }}
        >
            <With value={activePlayer}>
                {(player) => {
                    if (!player) {
                        return (
                            <box spacing={8}>
                                <image iconName="music-note-symbolic" />
                                <label label="No media" />
                            </box>
                        )
                    }

                    const title = createBinding(player, "title")
                    const artist = createBinding(player, "artist")

                    const displayText = createComputed([title, artist], (t, a) => {
                        const info = `${t || "Unknown"} - ${a || "Unknown"}`
                        return info.length > 40 ? info.substring(0, 37) + "..." : info
                    })

                    return (
                        <box spacing={8}>
                            <CavaVisualization />
                            <label label={displayText} />
                        </box>
                    )
                }}
            </With>
            <popover>
                {MediaPlayerMenu(popoverRef)}
            </popover>
        </menubutton>
    )
}
