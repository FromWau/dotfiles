return {
    {
        "FromWau/cronwhisper.nvim",
        ft = { "cron" },
        keys = {
            { "<C-k>", function() require("cronwhisper").show_float() end, desc = "Show cron description" },
        },
        opts = {},
    },
}
