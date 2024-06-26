import { show_media } from "libs/variables"
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { Media } from "./widgets/media/Media"
import { DividerH, DividerV } from "modules/utils/Divider"

const audio = await Service.import("audio")

/** @param {'speaker' | 'microphone'} type */
const VolumeSlider = (type: "speaker" | "microphone" = "speaker") =>
    Widget.Slider({
        hexpand: true,
        drawValue: false,
        onChange: ({ value }) => (audio[type].volume = value),
    }).hook(audio[type], (self) => {
        self.value = audio[type].volume
    })

/** @param {'speaker' | 'microphone'} type */
const VolumeIcon = (type: "speaker" | "microphone" = "speaker") =>
    Widget.Button({
        on_clicked: () => (audio[type].is_muted = !audio[type].is_muted),
        child: Widget.Icon().hook(audio[type], (self) => {
            const v: number = audio[type].volume * 100
            const maps = new Map<number, string>([
                [101, "overamplified"],
                [67, "high"],
                [34, "medium"],
                [1, "low"],
                [0, "muted"],
            ])

            const icon = [...maps].find(([threshold]) => threshold <= v)?.[1]

            self.icon = `audio-volume-${icon}-symbolic`
            self.tooltip_text = `Volume ${Math.round(v)}%`
        }),
    })

/** @param {'speaker' | 'microphone'} type */
const AudioCard = (type: "speaker" | "microphone" = "speaker") =>
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
                centerWidget: Widget.Label().hook(audio[type], (self) => {
                    self.label = `${type}: ${Math.round(audio[type].volume * 100)}%`
                }),
            }),

            Widget.Box({
                hexpand: true,
                children: [VolumeIcon(type), DividerV(30), VolumeSlider(type)],
            }),
        ],
    })

const Audio = () =>
    Widget.Box({
        class_name: "media-section",
        vertical: true,
        children: [AudioCard("speaker"), DividerH(0), AudioCard("microphone")],
    })

export const MediaMenu = (monitor: number = 0): Gtk.Window =>
    Widget.Window({
        name: `mediaMenu`,
        class_name: "revealer",
        monitor: monitor,
        anchor: ["top", "left"],
        exclusivity: "exclusive",
        child: Widget.Box({
            css: "min-width: 2px;min-height: 2px;",
            child: Widget.Revealer({
                revealChild: show_media.bind(),
                transition: "slide_down",
                transitionDuration: 1000,
                child: Widget.Box({
                    class_name: "media-menu",
                    vertical: true,
                    children: [Media(), Audio()],
                }),
            }),
        }),
    })
