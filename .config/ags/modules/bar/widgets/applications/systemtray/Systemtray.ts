const systemtray = await Service.import("systemtray")

/** @param {import('types/service/systemtray').TrayItem} item */
const SysTrayItem = (item: import("types/service/systemtray").TrayItem) =>
    Widget.Button({
        child: Widget.Icon().bind("icon", item, "icon"),
        tooltipMarkup: item.bind("tooltip_markup"),
        onPrimaryClick: (_, event) => item.activate(event),
        onSecondaryClick: (_, event) => item.openMenu(event),
    })

export const getSystemTrayItems = () =>
    systemtray.items.map((item) => {
        if (item.menu) item.menu.class_name = "systray-menu"

        return SysTrayItem(item)
    })
