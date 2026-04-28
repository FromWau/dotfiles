-- Android / KMP / Gradle integration: AVD, logcat, deploy, Gradle task browser.
-- Also covers plain Gradle work (e.g. Godot-Kotlin in ~/Projects/rpg).
-- Default keymaps live under <leader>a*: am menu, at targets, ab build, aa actions, ao tools.
return {
    {
        "iamironz/android-nvim-plugin",
        cmd = {
            "AndroidMenu",
            "AndroidTargets",
            "AndroidTools",
            "AndroidActions",
            "AndroidBuild",
            "AndroidRun",
            "AndroidRunStop",
            "AndroidLogcat",
            "AndroidBuildPrompt",
            "AndroidBuildAssemble",
            "AndroidGradleTasks",
            "AndroidIOSBuild",
            "AndroidIOSDeploy",
        },
        keys = {
            { "<leader>am", "<CMD>AndroidMenu<CR>", desc = "Android: menu" },
            { "<leader>at", "<CMD>AndroidTargets<CR>", desc = "Android: targets" },
            { "<leader>ao", "<CMD>AndroidTools<CR>", desc = "Android: tools" },
            { "<leader>aa", "<CMD>AndroidActions<CR>", desc = "Android: actions" },
            { "<leader>ab", "<CMD>AndroidBuild<CR>", desc = "Android: build" },
            { "<leader>ag", "<CMD>AndroidGradleTasks<CR>", desc = "Gradle: tasks" },
            { "<leader>al", "<CMD>AndroidLogcat<CR>", desc = "Android: logcat" },
        },
        config = function() require("android").setup() end,
    },
}
