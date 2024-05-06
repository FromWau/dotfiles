import { selection_owner_get_for_display } from "types/@girs/gdk-3.0/gdk-3.0.cjs"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

const SettingHeaderWidget = () =>
    Widget.Label({
        class_name: "settings-header",
        label: "Settings",
    })

const SettingItemsWidget = () => {
    const items = [
        SettingsItem.General,
        SettingsItem.Bluetooth,
        SettingsItem.Network,
    ]

    const itemList = Widget.Box({
        vertical: true,
        class_name: "settings-items",
        children: items.map((item) => item.label()),
    })

    // TODO: Change content on click -> setup + variable binding
    return Widget.Box({
        vertical: false,
        children: [itemList, items[0].content()],
    })
}

export const Settings = () =>
    Widget.Box({
        class_name: "settings",
        vertical: true,
        children: [SettingHeaderWidget(), SettingItemsWidget()],
    })

class SettingsItem {
    readonly name: string
    readonly icon: string
    private readonly _content: Gtk.Widget

    private constructor({
        name,
        icon,
        content,
    }: {
        name: string
        icon: string
        content: Gtk.Widget
    }) {
        this.name = name
        this.icon = icon
        this._content = content
    }

    static General = new SettingsItem({
        name: "General",
        icon: "preferences-system",
        content: Widget.Label({ label: "General settings" }),
    })

    static Bluetooth = new SettingsItem({
        name: "Bluetooth",
        icon: "bluetooth",
        content: Widget.Label({ label: "Bluetooth settings" }),
    })

    static Network = new SettingsItem({
        name: "Network",
        icon: "network-wired",
        content: Widget.Label({ label: "Network settings" }),
    })

    label(): Gtk.Widget {
        const onClick = (self: Gtk.Widget) => {
            self.connect("button-press-event", () =>
                console.log("Show content for", this.name)
            )
        }

        return Widget.Box({
            class_name: "settings-item-label",
            children: [
                Widget.Icon({
                    class_name: "settings-item-label-icon",
                    icon: this.icon,
                }),

                Widget.Label({
                    class_name: "settings-item-label-text",
                    label: this.name,
                }),
            ],
            setup: onClick,
        })
    }

    content(): Gtk.Widget {
        return Widget.Box({
            class_name: "settings-item-content",
            children: [this._content],
        })
    }
}
