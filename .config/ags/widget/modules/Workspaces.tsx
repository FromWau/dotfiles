import Hyprland from "gi://AstalHyprland"

const hyprland = Hyprland.get_default()

function get_workspaces() {
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
                }} >
                <label label={workspace_name} />
            </button >
        ))
}

export default function Workspaces() {
    return <box
        setup={(box) => {
            hyprland.connect("workspace-added", () => box.children = get_workspaces());
            hyprland.connect("workspace-removed", () => box.children = get_workspaces());
        }}
        children={get_workspaces()} >
    </box >
}

