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

    const specialWs = createComputed(
        [workspaces, clients], (ws, _) => {
            const specialWorkspace = ws.find((ws) => ws.name === "special:special")
            const hasClients = specialWorkspace ? specialWorkspace.clients.length > 0 : false

            return <button
                cssClasses={[hasClients ? "focused" : "", "specialworkspacebutton"]}
                onClicked={() => {
                    execAsync(`hyprctl dispatch togglespecialworkspace ""`)
                }}>
                <image iconName="workspace" />
            </button>
        }
    )

    const wsButtons = workspaces(ws =>
        ws.sort((a, b) => a.name.localeCompare(b.name))
            .filter((ws) => ws.name !== "special:special" && ws.name !== "special:__TEMP")
            .map((ws) => WorkspaceButton(ws))
    )

    return (
        <box>
            <With value={specialWs}>
                {specialWs => specialWs}
            </With>

            <For each={wsButtons}>
                {btn => btn}
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


