import { show_media } from "libs/variables"

const WINDOW_MEDIA = "media"

export const MediaWindow = (monitor: number = 0) =>
    Widget.Window({
        name: WINDOW_MEDIA,
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
                    children: [
                        Widget.Label({
                            label: "Media",
                        }),
                    ],
                }),
            }),
        }),
    })
