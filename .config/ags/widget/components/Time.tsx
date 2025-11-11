import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import GLib from "gi://GLib"
import "./../../utils/time.ts"

function getFormattedTime(): string {
    const now = GLib.DateTime.new_now_local()
    if (!now) return ""

    // Format: HH:MM:SS Day, DD. Month(MM) YYYY
    const time = now.format("%T")  // HH:MM:SS
    const day = now.format("%a")   // Day abbreviation (Mon, Tue, etc)
    const date = now.format("%e")  // Day of month (space padded)
    const month = now.format("%B") // Full month name
    const monthNum = now.format("%m") // Month number
    const year = now.format("%Y")  // Year

    return `${time} ${day}, ${date}. ${month}(${monthNum}) ${year}`
}

const time = createPoll("", (1).seconds, () => getFormattedTime())

export default function Time() {
    return (
        <menubutton>
            <label label={time} />
            <popover>
                <Gtk.Calendar />
            </popover>
        </menubutton>
    )
}
