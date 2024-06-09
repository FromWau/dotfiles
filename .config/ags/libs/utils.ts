import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { exec } from "resource:///com/github/Aylur/ags/utils.js"

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

/**
 * Recompile and reload the SCSS files
 */
export const reloadScss = () => {
    exec(`sass ${App.configDir}/scss/main.scss ${App.configDir}/style.css`)
    exec(
        `sass ${App.configDir}/scss/highlight.scss ${App.configDir}/highlight.css`
    )

    // Apply compiled css
    App.resetCss()
    App.applyCss(`${App.configDir}/style.css`)
}
