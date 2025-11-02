import { execAsync } from "ags/process";
import AstalHyprland from "gi://AstalHyprland"
import { createBinding, createComputed, For, With } from "gnim";


const hyprland = AstalHyprland.get_default();

function WorkspaceButton(ws: AstalHyprland.Workspace) {
    const isWorkspaceFocused = createBinding(hyprland, "focusedWorkspace").as(
        (focused) => [`${focused === ws ? "focused" : ""}`, "workspacebutton"]
    )

    return (
        <button
            cssClasses={isWorkspaceFocused}
            onClicked={() => {
                if (isWorkspaceFocused.get()[0] !== "focused") {
                    ws.focus();
                }
            }}>
            <label label={ws.name} />
        </button>
    )
}

export default function Workspaces() {
    const workspaces = createBinding(hyprland, "workspaces")
    const clients = createBinding(hyprland, "clients")

    const specialWsHasClients = createComputed(
        [workspaces, clients], (ws, _) => {
            const specialWorkspace = ws.find((ws) => ws.name === "special:special")
            return specialWorkspace ? specialWorkspace.clients.length > 0 : false
        }
    )

    const filteredWorkspaces = workspaces.as(ws =>
        ws.sort((a, b) => {
                const numA = parseInt(a.name) || 0
                const numB = parseInt(b.name) || 0
                return numA - numB
            })
            .filter((ws) => ws.name !== "special:special" && ws.name !== "special:__TEMP")
    )

    return (
        <box>
            <button
                cssClasses={specialWsHasClients.as(hasClients => [hasClients ? "focused" : "", "specialworkspacebutton"])}
                onClicked={() => {
                    execAsync(`hyprctl dispatch togglespecialworkspace ""`)
                }}>
                <image iconName="workspace" />
            </button>

            <For each={filteredWorkspaces}>
                {(ws) => WorkspaceButton(ws)}
            </For>

            <With value={workspaces}>
                {ws => (
                    <button onClicked={() => execAsync(`hyprctl dispatch workspace ${ws.length}`)}>
                        <label label="+" />
                    </button>
                )}
            </With>
        </box>
    )
}


