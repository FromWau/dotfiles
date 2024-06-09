import { selected_settings_item } from "libs/variables"

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
    const itemList = Widget.Box({
        class_name: "settings-items-labels",
        vertical: true,
        children: [
            SettingsItem("general"),
            SettingsItem("bluetooth"),
            SettingsItem("network"),
        ],
    })

    const content = Widget.Box({
        class_name: "settings-items-content",
        vertical: true,
        child: Widget.Stack({
            shown: selected_settings_item.bind(),
            children: {
                general: Widget.Label({ label: "General settings" }),
                bluetooth: Widget.Label({ label: "Bluetooth settings" }),
                network: Widget.Label({ label: "Network settings" }),
            },
        }),
    })

    return Widget.Box({
        class_name: "settings-items",
        vertical: false,
        children: [itemList, content],
    })
}

export const SettingsItem = (item: "general" | "bluetooth" | "network") => {
    const label = (icon: string, text: string) => {
        return Widget.Box({
            children: [
                Widget.Icon({
                    class_name: "settings-item-label-icon",
                    icon: icon,
                }),

                Widget.Label({
                    class_name: "settings-item-label-text",
                    label: text,
                }),
            ],
        })
    }

    return Widget.EventBox({
        child: Widget.Box({
            class_name: "settings-item-label",
            child: Widget.Stack({
                shown: item,
                children: {
                    general: label("preferences-system", "General"),
                    bluetooth: label("bluetooth", "Bluetooth"),
                    network: label("network-wired", "Network"),
                },
            }),
        }),
        on_primary_click: () => {
            if (selected_settings_item.getValue() != item) {
                console.log("SettingsItem", item)
                selected_settings_item.setValue(item)
            }
        },
    })
}
