import { bind, Binding, execAsync, Variable } from "astal"
import { Gdk, Gtk } from "astal/gtk4"
import Hyprland from "gi://AstalHyprland"

export default function Workspaces() {
    const hyprland = Hyprland.get_default();

    function WorkspaceButton(ws: Hyprland.Workspace): Gtk.Widget {
        const isWorkspaceFocused: Binding<string[]> = bind(hyprland, "focusedWorkspace").as(
            (focused) => [`${focused === ws ? "focused" : ""}`, "workspacebutton"]
        )

        return <button
            cssClasses={isWorkspaceFocused}
            onButtonPressed={(_self, event) => {
                switch (event.get_button()) {
                    case Gdk.BUTTON_PRIMARY:
                        if (isWorkspaceFocused.get()[0] !== "focused") {
                            ws.focus();
                        }
                        break;
                    case Gdk.BUTTON_SECONDARY:
                        break;
                    case Gdk.BUTTON_MIDDLE:
                        break;
                }
            }}>
            <label label={ws.name} />
        </button>;
    }


    const specialWs = Variable.derive(
        [bind(hyprland, "workspaces"), bind(hyprland, "clients")],
        (ws, _) => {
            const specialWorkspace = ws.find((ws) => ws.name === "special:special");
            const hasClients = specialWorkspace ? specialWorkspace.clients.length > 0 : false

            return <button
                cssClasses={[hasClients ? "focused" : "", "specialworkspacebutton"]}
                onButtonPressed={(_self, event) => {
                    switch (event.get_button()) {
                        case Gdk.BUTTON_PRIMARY:
                            execAsync(`hyprctl dispatch togglespecialworkspace ""`);
                            break;
                        case Gdk.BUTTON_SECONDARY:
                            break;
                        case Gdk.BUTTON_MIDDLE:
                            break;
                    }
                }}>
                <image iconName="workspace" />
            </button>;
        }
    )


    return <box>
        {
            bind(specialWs)
        }

        {
            bind(hyprland, "workspaces").as((ws) =>
                ws.sort((a, b) => a.name.localeCompare(b.name))
                    .filter((ws) => ws.name !== "special:special")
                    .map((ws) => WorkspaceButton(ws))
            )
        }

        {
            bind(hyprland, "workspaces").as((ws) => {
                return <button
                    onButtonPressed={(_self, event) => {
                        switch (event.get_button()) {
                            case Gdk.BUTTON_PRIMARY:
                                execAsync(`hyprctl dispatch workspace ${ws.length + 1}`);
                                break;
                            case Gdk.BUTTON_SECONDARY:
                                break;
                            case Gdk.BUTTON_MIDDLE:
                                break;
                        }
                    }}>
                    <label label="+" />
                </button>;

            })
        }

    </box>
}
