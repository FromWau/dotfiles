import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

type Anchor = "top" | "bottom" | "left" | "right"
type Transition =
    | "none"
    | "slide_up"
    | "slide_down"
    | "slide_left"
    | "slide_right"
    | "crossfade"
type RevealWindowProps = {
    name: string
    monitor: number
    anchor: Anchor[]
    transition: Transition
    binding: any
    child: Gtk.Widget
}

export const RevealerWindow = (props: RevealWindowProps): Gtk.Window => {
    return Widget.Window({
        name: props.name,
        class_name: "revealer",
        monitor: props.monitor,
        anchor: props.anchor,
        exclusivity: "exclusive",
        child: Widget.Box({
            css: "min-width: 2px;min-height: 2px;",
            child: Widget.Revealer({
                revealChild: props.binding,
                transition: props.transition,
                transitionDuration: 1000,
                child: props.child,
            }),
        }),
    })
}
