import { bind } from "astal"
import { hook } from "astal/gtk4"
import AstalTray from "gi://AstalTray"

function Item(item: AstalTray.TrayItem) {

    return <menubutton
        tooltipMarkup={bind(item, "tooltipMarkup")}
        menuModel={bind(item, "menuModel")}
        setup={self => hook(self, item, "notify::action-group", () => self.insert_action_group("dbusmenu", item.action_group))}
    >
        <image gicon={item.get_gicon()} />
    </menubutton>
}

export default function Tray() {
    const tray = AstalTray.Tray.get_default()

    return <box>
        {
            bind(tray, "items").as(items => items.map(item => Item(item)))
        }
    </box>
}
