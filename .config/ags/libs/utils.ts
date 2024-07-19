import Gtk from "types/@girs/gtk-3.0/gtk-3.0"
import { exec } from "resource:///com/github/Aylur/ags/utils.js"
import { show_media, show_session } from "./variables"

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

    // Apply compiled css
    App.resetCss()
    App.applyCss(`${App.configDir}/style.css`)
}

/**
 * Toggle the power menu
 */
export const toggleSessionMenu = () =>
    show_session.setValue(!show_session.value)

/**
 * Toggle the media menu
 * */
export const toggleMediaMenu = () => show_media.setValue(!show_media.value)

export function formatNumber(num: number, leadingSpace: number = 3): string {
    // Extract the integer and decimal parts
    let integerPart = Math.floor(num).toString()
    let decimalPart = Math.round((num % 1) * 100)
        .toString()
        .padEnd(2, "0")

    // Pad the integer part with leading spaces to ensure it has at least 3 digits
    integerPart = integerPart.padStart(leadingSpace, " ")

    // Combine the integer and fractional parts
    return `${integerPart}.${decimalPart}`
}
