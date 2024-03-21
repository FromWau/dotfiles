import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js"
import App from "resource:///com/github/Aylur/ags/app.js"
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import { Media } from "./widgets/Media.js"

const show_media = Variable(true)
const date = Variable("", {
    poll: [1000, "date '+%T      %a, %d. %_B(%m) %Y'"],
})

const Bar = (monitor = 0) =>
    Widget.Window({
        name: `bar-${monitor}`, // name has to be unique
        class_name: "bar",
        monitor,
        anchor: ["top", "left", "right"],
        exclusivity: "exclusive",
        child: Widget.CenterBox({
            start_widget: Left(),
            center_widget: Center(),
            end_widget: Right(),
        }),
    })

const Left = () =>
    Widget.Box({
        spacing: 8,
        children: [
            Workspaces(),
            // ClientTitle(),
        ],
    })

const Workspaces = () =>
    Widget.Box({
        class_name: "workspaces",
        children: Hyprland.bind("workspaces").transform((ws) => {
            return ws.map(({ id }) =>
                Widget.Button({
                    on_clicked: () =>
                        Hyprland.sendMessage(`dispatch workspace ${id}`),
                    child: Widget.Label(`${id === -99 ? "X" : id}`),
                    class_name: Hyprland.active.workspace
                        .bind("id")
                        .transform((i) => `${i === id ? "focused" : ""}`),
                })
            )
        }),
    })

const Center = () =>
    Widget.Box({
        spacing: 8,
        children: [],
    })

const Right = () =>
    Widget.Box({
        hpack: "end",
        spacing: 8,
        children: [AudioMenuToggle(), Clock()],
    })

const AudioMenuToggle = () =>
    Widget.Button({
        on_clicked: () => show_media.setValue(!show_media.getValue()),
        tooltip_text: "Audio Menu",
        child: Widget.Icon("media-tape-symbolic"),
    })

const Clock = () =>
    Widget.Label({
        class_name: "clock",
        label: date.bind(),
    })

const MediaMenu = (monitor = 0) =>
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

const Windows = () => {
    var wins = []
    wins.push(
        MediaMenu(Hyprland.active.workspace.bind("id").transform((i) => i - 1))
    )

    Hyprland.monitors.forEach((monitor) => {
        // INFO: This is not dynamic, use bind if we want to make it dynamic
        wins.push(Bar(monitor.id))
    })

    // wins.push(Bar(Hyprland.active.workspace.bind("id").transform((i) => i - 1)))

    return wins
}

/** @param {('vertical'|'horizontal')} orientation */
/** @param {number} space */
const Spacer = (orientation = "vertical", space = 10) =>
    Widget.Box({
        class_name: "spacer",
        css: `${orientation === "vertical" ? "margin-right" : "margin-top"}:${space}px;`,
        child: Widget.Label(""),
    })

/**
 * Set a vertical divider `|`
 * @param {number} length Define the length of the divider
 */
const DividerV = (length = 30) =>
    Widget.Box({
        css: `
    color: @insensitive_fg_color;
    margin-left: 20px;
    margin-right: 10px;

    background-color: @insensitive_fg_color;
    min-height: ${length}px;
    min-width: 0.5px;
`,
    })

/**
 * Set a horizontal divider `-`
 * @param {number} length Define the length of the divider
 */
const DividerH = (length = 350) =>
    Widget.Box({
        css: `
    color: @insensitive_fg_color;
    margin-top: 20px;
    margin-bottom: 10px;

    background-color: @insensitive_fg_color;
    min-width: ${length}px;
    min-height: 0.5px;
        `,
    })

App.config({
    style: App.configDir + "/style.css",
    windows: Windows(),
})
