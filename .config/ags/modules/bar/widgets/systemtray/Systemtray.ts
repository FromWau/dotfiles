const systemtray = await Service.import("systemtray")

/** @param {import('types/service/systemtray').TrayItem} item */
const SysTrayItem = (item: import("types/service/systemtray").TrayItem) =>
    Widget.Button({
        child: Widget.Icon().bind("icon", item, "icon"),
        tooltipMarkup: item.bind("tooltip_markup"),
        onPrimaryClick: (_, event) => item.activate(event),
        onSecondaryClick: (_, event) => item.openMenu(event),
    })

export const Systemtray = () =>
    Widget.Box({
        children: systemtray.bind("items").as((i) => i.map(SysTrayItem)),
    })
