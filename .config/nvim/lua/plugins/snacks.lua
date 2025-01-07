return {
    "folke/snacks.nvim",
    dependencies = {
        { "nvim-tree/nvim-web-devicons", enabled = vim.g.have_nerd_font },
    },
    priority = 1000,
    lazy = false,
    opts = {
        bufdelete = { enabled = true },
        -- bigfile = { enabled = true },
        -- dashboard = { enabled = true },
        -- indent = { enabled = true },
        input = { enabled = true },
        notifier = { enabled = true },
        -- quickfile = { enabled = true },
        -- scroll = { enabled = true },
        statuscolumn = { enabled = true },
        -- words = { enabled = true },
    },
    keys = {
        { "<leader>bd", function() Snacks.bufdelete() end, desc = "Delete Buffer" },
        { "<leader>cR", function() Snacks.rename.rename_file() end, desc = "Rename File" },
        { "<leader>un", function() Snacks.notifier.hide() end, desc = "Dismiss All Notifications" },
    },
}
