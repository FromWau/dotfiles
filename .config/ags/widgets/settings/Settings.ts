import { selected_settings_item } from "libs/variables"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

export const Settings = () =>
    Widget.Box({
        class_name: "settings",
        vertical: true,
        children: [SettingHeaderWidget(), SettingItemsWidget()],
    })

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
        class_name: "settings-items-labels",
        vertical: true,
        children: items.map((item) => item.label()),
    })

    const content = Widget.Box({
        class_name: "settings-items-content",
        vertical: true,
        setup: (self) =>
            selected_settings_item.connect("changed", ({ value }) => {
                self.child = value.content()
            }),
        // child: selected_settings_item.bind().as((item) => item.content()),
    })

    return Widget.Box({
        class_name: "settings-items",
        vertical: false,
        children: [itemList, content],
    })
}

export class SettingsItem {
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
        return Widget.EventBox({
            child: Widget.Box({
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
            }),
            on_primary_click: () => {
                if (selected_settings_item.getValue() !== this) {
                    selected_settings_item.setValue(this)
                }
            },
        })
    }

    content(): Gtk.Widget {
        return Widget.Box({
            vertical: true,
            expand: true,
            class_name: "settings-item-content",
            child: this._content,
        })
    }
}
