return {
    "folke/which-key.nvim",
    event = "VeryLazy",
    config = function(_, opts)
        local wk = require("which-key")
        wk.setup(opts)
        wk.register(opts.defaults)
        wk.register({
            -- Pane and Window Navigation
            ["<C-h>"] = { "<C-w>h", "Navigate Left" },
            ["<C-Left>"] = { "<C-w>h", "Navigate Left" },
            ["<C-j>"] = { "<C-w>j", "Navigate Down" },
            ["<C-Down>"] = { "<C-w>j", "Navigate Down" },
            ["<C-k>"] = { "<C-w>k", "Navigate Up" },
            ["<C-Up>"] = { "<C-w>k", "Navigate Up" },
            ["<C-l>"] = { "<C-w>l", "Navigate Right" },
            ["<C-Right>"] = { "<C-w>l", "Navigate Right" },

            -- Clear search with <esc>
            ["<esc>"] = { "<cmd>noh<cr><esc>", "Escape and clear hlsearch" },
        }, { mode = "n", prefix = "" })

        wk.register({
            -- Indenting
            ["<"] = { "<gv", "Shift Indentation to Left" },
            [">"] = { ">gv", "Shift Indentation to Right" },
        }, { mode = "v", prefix = "" })

        wk.register({
            -- Buffer Navigation
            b = {
                name = "Buffer",
                n = { "<cmd>bnext<CR>", "next" },
                p = { "<cmd>bprevious<CR>", "previous" },
                d = { "<cmd>bdelete<CR>", "delete" },
                b = { "<cmd>e #<CR>", "last" },
            },
            ["`"] = { "<cmd>e #<CR>", "Buffer last" },

            -- Window Management
            s = {
                name = "Split window",
                v = { "<cmd>vsplit<CR>", "Vertically" },
                h = { "<cmd>split<CR>", "Horizontally" },
                m = { "<cmd>MaximizerToggle<CR>", "Minimise" },
            },

            -- Lazy
            l = { "<cmd>Lazy<CR>", "[L]azy" },

            -- UI
            u = {
                name = "UI",
                d = { "<cmd>Noice dismiss<CR>", "Dismiss noice" },
            },
        }, { mode = "n", prefix = "<leader>" })
    end,
    opts = {
        plugins = { spelling = true },
        defaults = {
            mode = { "n", "v" },
            ["gs"] = { name = "+surround" },
            ["]"] = { name = "+next" },
            ["["] = { name = "+prev" },
            ["<leader>b"] = { name = "+buffer" },
            ["<leader>c"] = { name = "+code" },
            ["<leader>f"] = { name = "+file/find" },
            ["<leader>s"] = { name = "+search" },
            ["<leader>u"] = { name = "+ui" },
            ["<leader>h"] = { name = "+harpoon" },
            ["<leader>x"] = { name = "+trouble" }
        },
    },
}
