return {
    {
        "FromWau/rink.nvim",
        opts = {},
        keys = {
            { "<leader>h", function() require("rink").rink() end, desc = "Rink", mode = "v" },
        },
    },
}
