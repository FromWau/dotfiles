return {
    "stevearc/oil.nvim",
    opts = {},
    dependencies = { { "echasnovski/mini.icons", opts = {} } },
    keys = {
        {
            "<leader>e",
            function() require("oil").toggle_float() end,
            desc = "Open oil",
        },
    },
}
