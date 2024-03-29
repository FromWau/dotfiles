const bluetooth = await Service.import("bluetooth")

const connectedList = Widget.Box({
    setup: (self) =>
        self.hook(
            bluetooth,
            (self) => {
                self.children = bluetooth.connected_devices.map(
                    ({ icon_name, name }) =>
                        Widget.Box([
                            Widget.Icon(icon_name + "-symbolic"),
                            Widget.Label(name),
                        ])
                )

                self.visible = bluetooth.connected_devices.length > 0
            },
            "notify::connected-devices"
        ),
})

const indicator = Widget.Icon({
    icon: bluetooth
        .bind("enabled")
        .as((on) => `bluetooth-${on ? "active" : "disabled"}-symbolic`),
})

export const BluetoothIndicator = () =>
    Widget.Revealer({
        revealChild: false,
        transitionDuration: 1000,
        transition: "slide_right",
        child: connectedList,
        setup: (self) =>
            self.poll(2000, () => {
                self.reveal_child = !self.reveal_child
            }),
    })
