import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import "./../../utils/time.ts"

const time = createPoll("", (1).seconds, "date '+%T %a, %d. %_B(%m) %Y'")

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
