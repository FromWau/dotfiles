import AstalTray from "gi://AstalTray"
import { createBinding, For } from "gnim"


function Item(item: AstalTray.TrayItem) {
    const tooltipMarkup = createBinding(item, "tooltipMarkup")
    const menuModel = createBinding(item, "menuModel")
    const icon = createBinding(item, "gicon")

    return <menubutton
        tooltipMarkup={tooltipMarkup}
        menuModel={menuModel}
        $={(self) => {
            // Insert the action group directly from the item
            const ag = item.get_action_group()
            if (ag) {
                self.insert_action_group("dbusmenu", ag)
            }
        }}
    >
        <image gicon={icon} />
    </menubutton>
}

export default function Tray() {
    const tray = AstalTray.Tray.get_default()
    const items = createBinding(tray, "items")

    return (
        <box>
            <For each={items}>
                {item => Item(item)}
            </For>
        </box>
    )
}
