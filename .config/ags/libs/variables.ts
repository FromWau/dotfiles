import { SettingsItem } from "widgets/settings/Settings"

export const date = Variable("", {
    poll: [1000, "date '+%T      %a, %d. %_B(%m) %Y'"],
})

export const show_media = Variable(false)

export const show_settings = Variable(false)

export const selected_settings_item = Variable(SettingsItem.General)

selected_settings_item.connect("changed", ({ value }) => {
    console.log("Selected settings item:", value.name)
})
