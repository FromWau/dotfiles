const battery = await Service.import("battery")

export const Battery = () =>
    Widget.Box({
        class_name: battery.bind("charging").as((ch) => (ch ? "charging" : "")),
        visible: battery.bind("available"),
        children: [
            Widget.Icon({
                icon: battery.bind("icon_name"),
            }),
            Widget.Label({
                label: battery.bind("percent").as((p) => p.toString() + "%"),
            }),
        ],
    })
