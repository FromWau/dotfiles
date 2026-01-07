import { currentDisplayMode } from "../../utils/displayMode"
import { execAsync } from "ags/process"

export default function MouseModeIndicator() {
    return (
        <button
            visible={currentDisplayMode.as((mode) => mode !== "normal")}
            onClicked={() => execAsync("ags request display cycle")}
            cssClasses={["display-mode-indicator"]}
            tooltipText={currentDisplayMode.as((mode) => `Display: ${mode} (click to cycle)`)}
        >
            <box spacing={4}>
                <image
                    iconName={currentDisplayMode.as((mode) =>
                        mode === "game" ? "applications-games-symbolic" : "input-mouse-symbolic"
                    )}
                />
                <label
                    label={currentDisplayMode.as((mode) =>
                        mode === "game" ? "Game Mode" : "Mouse Mode"
                    )}
                />
            </box>
        </button>
    )
}
