import icons from "libs/icons"
import { runner_location } from "libs/variables"
import { queryLocation } from "modules/runner/mode/location/queryLocation"
import Gtk from "types/@girs/gtk-3.0/gtk-3.0"

export const Weather = () =>
    Widget.Box({
        tooltip_text: "Current City",
        setup: (self) =>
            self.hook(runner_location, () => {
                const c = runner_location.getValue()

                var children: Gtk.Widget[] = []

                switch (c) {
                    case "searching":
                        children.push(
                            Widget.Icon({
                                class_name: "bar-item",
                                icon: icons.weather.location.searching,
                            })
                        )
                        children.push(
                            Widget.Label({
                                class_name: "bar-item",
                                label: "Searching...",
                            })
                        )
                        break

                    case undefined:
                        children.push(
                            Widget.Icon({
                                class_name: "bar-item",
                                icon: icons.weather.location.unavailable,
                            })
                        )
                        children.push(
                            Widget.Button({
                                class_name: "bar-item",
                                label: "Enter city name",
                                on_clicked: () => queryLocation(""),
                            })
                        )
                        break

                    case "unavailable":
                        children.push(
                            Widget.Icon({
                                class_name: "bar-item",
                                icon: icons.weather.location.unavailable,
                            })
                        )
                        children.push(
                            Widget.Label({
                                class_name: "bar-item",
                                label: "Unavailable",
                            })
                        )
                        break

                    default:
                        if (c && typeof c === "object") {
                            children.push(
                                Widget.Icon({
                                    class_name: "bar-item",
                                    icon: icons.weather.location.available,
                                })
                            )
                            children.push(
                                Widget.Label({
                                    class_name: "bar-item",
                                    label: c.name,
                                })
                            )
                            children.push(
                                Widget.Button({
                                    class_name: "bar-item",
                                    on_clicked: () => queryLocation(""),
                                    child: Widget.Icon({
                                        icon: icons.weather.location.edit,
                                    }),
                                })
                            )
                        }
                }

                self.children = children
            }),
    })
