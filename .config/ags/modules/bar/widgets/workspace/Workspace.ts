import icons from "libs/icons"

const hyprland = await Service.import("hyprland")

export const Workspaces = () =>
    Widget.Box({
        class_name: "bar-section",
    }).hook(hyprland, (self) => {
        self.children = [
            Widget.Button({
                on_clicked: () =>
                    hyprland.message("dispatch togglespecialworkspace"),
                class_name:
                    "bar-item" +
                    (hyprland.workspaces.some((ws) => ws.id === -99)
                        ? " focused"
                        : ""),
                child: Widget.Icon({
                    icon: icons.workspace.special,
                    size: 16,
                }),
            }),
            ...hyprland.workspaces
                .map((ws) => ws.id)
                .filter((id) => id !== -99)
                .sort()
                .map((id) =>
                    Widget.Button({
                        on_clicked: () =>
                            hyprland.message(`dispatch workspace ${id}`),
                        class_name:
                            "bar-item" +
                            (hyprland.active.workspace.id === id
                                ? " focused"
                                : ""),
                        child: Widget.Label(`${id}`),
                    })
                ),
        ]
    })
