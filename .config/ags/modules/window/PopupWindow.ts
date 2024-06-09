import { type WindowProps } from "types/widgets/window"
import { type RevealerProps } from "types/widgets/revealer"
import { type Binding } from "types/binding"

type Transition = RevealerProps["transition"]
type Exclusivity = WindowProps["exclusivity"]
type Child = WindowProps["child"]
type Position = "center" | "top" | "topLeft" | "topCenter" | "topRight"
type Anchor = "top" | "bottom" | "left" | "right"

const Layout = (name: string, transition: Transition, child: Child) => ({
    center: () =>
        Widget.CenterBox({
            vertical: true,
            child: Widget.Revealer({
                transition: transition,
                child: child,
            }),
        }),
    top: () =>
        Widget.CenterBox({
            vertical: true,
            child: Widget.Revealer({
                name: name,
                transition: transition,
                child: child,
            }),
        }),

    topLeft: () =>
        Widget.CenterBox({
            vertical: true,
            child: Widget.Revealer({
                name: name,
                transition: transition,
                child: child,
            }),
        }),
    topCenter: () =>
        Widget.CenterBox({
            vertical: true,
            child: Widget.Revealer({
                name: name,
                transition: transition,
                child: child,
            }),
        }),
    topRight: () =>
        Widget.CenterBox({
            vertical: true,
            child: Widget.Revealer({
                name: name,
                transition: transition,
                child: child,
            }),
        }),
})

const PopupWindow = (
    name: string,
    monitor: number = 0,
    position: Position = "center",
    transition: Transition,
    exclusivity: Exclusivity = "ignore",
    anchor: Anchor[] = ["top", "bottom", "left", "right"],
    revealChild: Binding<boolean>,
    child: Child
) =>
    Widget.Window({
        name: name,
        class_name: `popup-${name}`,
        monitor: monitor,
        layer: "top",
        anchor: anchor,
        exclusivity: exclusivity,
        setup: (w) => w.keybind("Escape", () => App.closeWindow(name)),
        child: Widget.Box({
            css: "padding:1px;",
            child: Widget.Revealer({
                revealChild: revealChild.bind(),
                transition: "slide_down",
                transitionDuration: 1000,
                child: Layout(name, transition, child)[position](),
            }),
        }),
    })

export default PopupWindow
