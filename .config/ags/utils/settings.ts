// Settings window controller
let showSettingsFn: (() => void) | null = null

export function registerShowSettings(fn: () => void) {
    showSettingsFn = fn
}

export function showSettings() {
    if (showSettingsFn) {
        showSettingsFn()
    } else {
        console.warn("Settings window not registered yet")
    }
}
