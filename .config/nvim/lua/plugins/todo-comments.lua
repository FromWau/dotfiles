return {
    "folke/todo-comments.nvim",
    event = "VimEnter",
    dependencies = { "nvim-lua/plenary.nvim" },
    opts = { signs = true },
    keys = {
        {
            "]t",
            function() require("todo-comments").jump_next() end,
            mode = "n",
            desc = "Next todo comment",
        },

        {
            "[t",
            function() require("todo-comments").jump_prev() end,
            mode = "n",
            desc = "Previous todo comment",
        },
    },
}
