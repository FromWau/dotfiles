const WINDOW_DESKTOP = "desktop"

const Desktop = () => Widget.Label({ label: "Desktop" })

export const DesktopWindow = (monitor = 0) =>
    Widget.Window({
        name: `${WINDOW_DESKTOP}-${monitor}`,
        monitor,
        exclusivity: "exclusive",
        child: Desktop(),
    })
