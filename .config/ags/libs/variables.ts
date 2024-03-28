import GLib from "gi://GLib"

export const date = Variable("", {
    poll: [1000, "date '+%T      %a, %d. %_B(%m) %Y'"],
})

export const show_media = Variable(true)

export const clock = Variable(GLib.DateTime.new_now_local(), {
    poll: [1000, () => GLib.DateTime.new_now_local()],
})
