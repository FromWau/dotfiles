import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

const hyprland = await Service.import("hyprland")

/**
 * Create the widget for every Hyprland monitor
 **/
export const forMonitors = (widget: (monitor_id: number) => Gtk.Window) => {
    return hyprland.monitors.map((monitor) => widget(monitor.id))
}

/**
 * Create the Widget for the active workspace
 **/
export const forActiveWorkspace = (
    widget: (monitor_id: number) => Gtk.Window
): Gtk.Window => widget(hyprland.active.monitor.id)
