import Hyprland from "gi://AstalHyprland"

function get_workspaces(hyprland: Hyprland.Hyprland) {
    const ws = hyprland.get_workspaces()
        .map((workspace) => {
            const name = workspace.get_name();
            return name == "special:special" ? "X" : name;
        });

    if (ws.find((workspace_name) => workspace_name == "X") == undefined) {
        ws.push("X");
    }

    return ws.sort()
        .map((workspace_name) => (
            <button
                tooltipText={`Switch to Workspace: ` + workspace_name}
                onClick={() => {
                    if (workspace_name == "X") {
                        hyprland.dispatch("togglespecialworkspace", "");
                    } else {
                        hyprland.dispatch("workspace", workspace_name);
                    }
                }}
                setup={(self) => {
                    self.toggleClassName("active", hyprland.get_focused_workspace().get_name() == workspace_name)

                    self.hook(hyprland, "notify::focused-workspace", () => {
                        self.toggleClassName("active", hyprland.get_focused_workspace().get_name() == workspace_name)
                    })
                }} >
                {workspace_name}
            </button >
        ))
}

export default function Workspaces() {
    const hyprland = Hyprland.get_default()
    return <box
        name="Workspaces"
        setup={(self) => self.hook(hyprland, "notify::workspaces", () => self.children = get_workspaces(hyprland))} >
        {get_workspaces(hyprland)}
    </box >
}

