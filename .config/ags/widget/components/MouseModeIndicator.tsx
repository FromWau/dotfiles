import { mouseModeEnabled } from "../../utils/mouseMode"
import { execAsync } from "ags/process"

export default function MouseModeIndicator() {
    return (
        <button
            visible={mouseModeEnabled.as((enabled) => enabled)}
            onClicked={() => execAsync("ags request mousemode toggle")}
            cssClasses={["mouse-mode-indicator"]}
            tooltipText="Click to disable Mouse Mode"
        >
            <box spacing={4}>
                <image iconName="input-mouse-symbolic" />
                <label label="Mouse Mode" />
            </box>
        </button>
    )
}
