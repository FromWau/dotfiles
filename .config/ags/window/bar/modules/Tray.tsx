import { Gio, bind } from "astal"
import { Gdk, Gtk } from "astal/gtk3"
import AstalTray from "gi://AstalTray"

function Item(item: AstalTray.TrayItem) {
    const menu = createMenu(item.menu_model, item.action_group)

    return <button
        tooltip_text={item.title}
        tooltip_markup={bind(item, "tooltip_markup")}
        onDestroy={() => menu?.destroy()}

        onClickRelease={(btn, event) => {
            switch (event.button) {
                case Gdk.BUTTON_PRIMARY:
                    item.activate(0, 0)
                    break
                case Gdk.BUTTON_SECONDARY:
                    menu?.popup_at_widget(btn, Gdk.Gravity.SOUTH, Gdk.Gravity.NORTH, null)
                    break
                case Gdk.BUTTON_MIDDLE:
                    break
                default:
                    printerr("Unhandled button", event.button)
            }
        }}
    >
        <icon g_icon={item.gicon} />
    </button >
}

function createMenu(menuModel: Gio.MenuModel, actionGroup: Gio.ActionGroup): Gtk.Menu {
    const menu: Gtk.Menu = Gtk.Menu.new_from_model(menuModel);
    menu.insert_action_group("dbusmenu", actionGroup);
    return menu;
}

export default function Tray() {
    const tray = AstalTray.Tray.get_default()

    return <box>
        {
            bind(tray, "items").as(items => items.map(item => Item(item)))
        }
    </box>
}
