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
            ["<C-j>"] = { "<C-w>j", "Navigate Down" },
            ["<C-k>"] = { "<C-w>k", "Navigate Up" },
            ["<C-l>"] = { "<C-w>l", "Navigate Right" },

            -- Comments
            ["<C-/>"] = { "<Plug>(comment_toggle_linewise_current) j", "Comment Line" },
            ["<C-kdivide>"] = { "<Plug>(comment_toggle_linewise_current) j", "Comment Line" },
        }, { mode = "n", prefix = "" })

        wk.register({
            -- Indenting
            ["<"] = { "<gv", "Shift Indentation to Left" },
            [">"] = { ">gv", "Shift Indentation to Right" },

            -- Comments
            ["<C-/>"] = { "<Plug>(comment_toggle_linewise_visual)", "Comment Line" },
            ["<C-kdivide>"] = { "<Plug>(comment_toggle_linewise_visual)", "Comment Line" },
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

            -- Clear search with <esc>
            ["<esc>"] = { "<cmd>noh<cr><esc>", "Escape and clear hlsearch" },

            -- UI
            u = {
                name = "UI",
                d = { "<cmd>Noice dismiss<CR>", "Dismiss noice" },
            },

            -- Code Actions


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
