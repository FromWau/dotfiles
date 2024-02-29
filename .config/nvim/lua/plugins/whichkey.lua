return {
    "folke/which-key.nvim",
    event = "VeryLazy",
    config = function(_, opts)
        local wk = require "which-key"
        wk.setup(opts)
        wk.register(opts.defaults)
        wk.register({
            -- Window Management
            s = {
                name = "Split window",
                v = { "<cmd>vsplit<CR>", "Vertically" },
                h = { "<cmd>split<CR>", "Horizontally" },
                m = { "<cmd>MaximizerToggle<CR>", "Minimise" },
            },

            -- Lazy
            l = { "<cmd>Lazy<CR>", "[L]azy" },
        }, { mode = "n", prefix = "<leader>" })
    end,
    opts = {
        plugins = { spelling = true },
        defaults = {
            mode = { "n", "v" },
            ["<leader>b"] = { name = "+Buffer" },
            ["<leader>c"] = { name = "+Code" },
            ["<leader>f"] = { name = "+File/Find" },
            ["<leader>s"] = { name = "+Search" },
            ["<leader>u"] = { name = "+Ui" },
            ["<leader>h"] = { name = "+Harpoon" },
            ["<leader>x"] = { name = "+Trouble" },
        },
    },
}
