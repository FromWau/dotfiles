import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

type RevealWindowProps = {
    name?: string
    monitor?: number
    anchor?: ("top" | "bottom" | "left" | "right")[]
    transition?:
        | "none"
        | "slide_up"
        | "slide_down"
        | "slide_left"
        | "slide_right"
        | "crossfade"
    binding?: any
    child?: Gtk.Widget
    keymode?: "exclusive" | "on-demand" | "none"
    exclusivity?: "exclusive" | "ignore"
    hexpand?: boolean
    vexpand?: boolean
    window_position?: Gtk.WindowPosition
}

export const RevealerWindow = ({
    name,
    monitor,
    anchor,
    transition,
    binding,
    child,
    keymode = "none",
    exclusivity = "ignore",
    hexpand = false,
    vexpand = false,
    window_position = Gtk.WindowPosition.NONE,
}: RevealWindowProps): Gtk.Window => {
    return Widget.Window({
        window_position: window_position,
        name: name,
        monitor: monitor,
        anchor: anchor,
        exclusivity: exclusivity,
        keymode: keymode,
        vexpand: vexpand,
        hexpand: hexpand,
        child: Widget.Box({
            css: "min-width: 2px;min-height: 2px;",
            child: Widget.Revealer({
                revealChild: binding,
                transition: transition,
                transitionDuration: 1000,
                child: child,
            }),
        }),
    })
}
