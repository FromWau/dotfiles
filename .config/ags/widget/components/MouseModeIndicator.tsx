import { currentDisplayMode } from "../../utils/displayMode"
import { execAsync } from "ags/process"
import Gtk from "gi://Gtk?version=4.0"

export default function MouseModeIndicator() {
    return (
        <button
            visible={currentDisplayMode.as((mode) => mode !== "normal")}
            onClicked={() => execAsync("ags request display cycle")}
            cssClasses={["display-mode-indicator"]}
            tooltipText={currentDisplayMode.as((mode) => `Display: ${mode} (left-click to cycle, right-click for normal)`)}
            $={(self) => {
                // Add right-click gesture controller
                const rightClickGesture = Gtk.GestureClick.new()
                rightClickGesture.set_button(3) // Button 3 = right mouse button
                rightClickGesture.connect("pressed", () => {
                    execAsync("ags request display normal")
                })
                self.add_controller(rightClickGesture)
            }}
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
