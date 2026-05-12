import { currentDisplayMode, cycleDisplayMode, setDisplayMode } from "../../utils/displayMode"
import Gtk from "gi://Gtk?version=4.0"

export default function MouseModeIndicator() {
    return (
        <button
            visible={currentDisplayMode.as((mode) => mode !== "normal")}
            onClicked={() => cycleDisplayMode()}
            cssClasses={["display-mode-indicator"]}
            tooltipText={currentDisplayMode.as((mode) => `Display: ${mode} (left-click to cycle, right-click for normal)`)}
            $={(self) => {
                const rightClickGesture = Gtk.GestureClick.new()
                rightClickGesture.set_button(3)
                rightClickGesture.connect("pressed", () => {
                    setDisplayMode("normal")
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
