import { show_media } from "libs/variables.js"
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import { Media } from "widgets/Media.js"
import { DividerH, DividerV } from "widgets/utils/Divider.js"
import { Spacer } from "widgets/utils/Spacer.js"

const audio = await Service.import("audio")

/** @param {'speaker' | 'microphone'} type */
const VolumeSlider = (type = "speaker") =>
    Widget.Slider({
        hexpand: true,
        drawValue: false,
        onChange: ({ value }) => (audio[type].volume = value),
        value: audio[type].bind("volume"),
    })

/** @param {'speaker' | 'microphone'} type */
const VolumeIcon = (type = "speaker") =>
    Widget.Button({
        on_clicked: () => (audio[type].is_muted = !audio[type].is_muted),
        child: Widget.Icon().hook(audio[type], (self) => {
            const v = audio[type].volume * 100
            const icon = [
                [101, "overamplified"],
                [67, "high"],
                [34, "medium"],
                [1, "low"],
                [0, "muted"],
            ].find(([threshold]) => threshold <= v)?.[1]
            self.icon = `audio-volume-${icon}-symbolic`
            self.tooltip_text = `Volume ${Math.round(v)}%`
        }),
    })

/** @param {'speaker' | 'microphone'} type */
const AudioCard = (type = "speaker") =>
    Widget.Box({
        class_name: "audio-card",
        vertical: true,
        children: [
            Widget.CenterBox({
                endWidget: Widget.Icon({
                    class_name: "icon",
                    hexpand: true,
                    hpack: "end",
                    vpack: "start",
                }).hook(audio[type], (self) => {
                    var icon = ""

                    switch (type) {
                        case "speaker":
                            icon = "audio-speakers-symbolic"
                            break
                        case "microphone":
                            icon = "audio-input-microphone-symbolic"
                            break
                        default:
                            break
                    }

                    self.icon = icon
                    self.tooltip_text = type
                }),
                centerWidget: Widget.Label({
                    label: audio[type]
                        .bind("volume")
                        .transform((v) => `${type}: ${Math.round(v * 100)}%`),
                }),
            }),

            Widget.Box({
                hexpand: true,
                children: [
                    VolumeIcon(type),
                    // Spacer("vertical", 20),
                    DividerV(30),
                    VolumeSlider(type),
                ],
            }),
        ],
    })

const Audio = () =>
    Widget.Box({
        class_name: "media-section",
        vertical: true,
        children: [AudioCard("speaker"), DividerH(0), AudioCard("microphone")],
    })

export const MediaMenu = (monitor = 0) =>
    Widget.Window({
        name: `mediaMenu-${monitor}`,
        class_name: "revealer",
        monitor,
        anchor: ["top", "left"],
        exclusivity: "exclusive",
        child: Widget.Box({
            css: "padding:1px;",
            child: Widget.Revealer({
                revealChild: show_media.bind(),
                transition: "slide_down",
                transitionDuration: 1000,
                child: Widget.Box({
                    class_name: "media-menu",
                    vertical: true,
                    children: [Media(), Spacer("horizontal", 10), Audio()],
                }),
            }),
        }),
    })
