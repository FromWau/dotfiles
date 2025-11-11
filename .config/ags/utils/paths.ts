import GLib from "gi://GLib"

export const PATHS = {
    config: {
        dir: GLib.get_user_config_dir() + "/ags",
        file: GLib.get_user_config_dir() + "/ags/config.json",
        scss: GLib.get_user_config_dir() + "/ags/scss/main.scss",
    },
    data: {
        dir: GLib.get_user_data_dir() + "/ags",
        css: GLib.get_user_data_dir() + "/ags/style.css",
        history: GLib.get_user_data_dir() + "/ags/theme-history.json",
    },
    wallpapers: GLib.get_home_dir() + "/Pictures/wallpapers",
} as const

// Validate paths on startup
export function validatePaths(): string[] {
    const errors: string[] = []

    if (!GLib.file_test(PATHS.config.dir, GLib.FileTest.IS_DIR)) {
        errors.push(`Config directory missing: ${PATHS.config.dir}`)
    }

    if (!GLib.file_test(PATHS.config.scss, GLib.FileTest.EXISTS)) {
        errors.push(`SCSS file missing: ${PATHS.config.scss}`)
    }

    if (!GLib.file_test(PATHS.data.dir, GLib.FileTest.IS_DIR)) {
        // Try to create data directory
        try {
            GLib.mkdir_with_parents(PATHS.data.dir, 0o755)
            console.log(`Created data directory: ${PATHS.data.dir}`)
        } catch (err) {
            errors.push(`Failed to create data directory: ${PATHS.data.dir}`)
        }
    }

    if (!GLib.file_test(PATHS.wallpapers, GLib.FileTest.IS_DIR)) {
        errors.push(`Wallpaper directory missing: ${PATHS.wallpapers}`)
    }

    return errors
}
