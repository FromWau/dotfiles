return {
    "tpope/vim-sleuth", -- Detect tabstop and shiftwidth automatically
    {
        "folke/todo-comments.nvim", -- Highlight todo, notes, etc in comments
        dependencies = "nvim-lua/plenary.nvim",
    },

    {
        "numToStr/Comment.nvim",
        keys = {
            { "<C-/>", "<Plug>(comment_toggle_linewise_current) j", desc = "Comment Line", mode = { "n" } },
            { "<C-kdivide>", "<Plug>(comment_toggle_linewise_current) j", desc = "Comment Line", mode = { "n" } },
            { "<C-7>", "<Plug>(comment_toggle_linewise_current) j", desc = "Comment Line", mode = { "n" } },
            { "<C-/>", "<Plug>(comment_toggle_linewise_visual)", desc = "Comment Line", mode = { "v" } },
            { "<C-kdivide>", "<Plug>(comment_toggle_linewise_visual)", desc = "Comment Line", mode = { "v" } },
            { "<C-7>", "<Plug>(comment_toggle_linewise_visual)", desc = "Comment Line", mode = { "v" } },
        },
    },

    {
        "lewis6991/gitsigns.nvim",
        opts = {
            signs = {
                add = { text = "󰐗" },
                change = { text = "" },
                delete = { text = "󰍶" },
                topdelete = { text = "‾" },
                changedelete = { text = "󰏯" },
                untracked = { text = "?" },
            },
            on_attach = function(bufnr)
                local gs = package.loaded.gitsigns
                require("utils.keymaps").nmap("<leader>tb", gs.toggle_current_line_blame, { buffer = bufnr })
            end,
        },
    },

    { -- Collection of various small independent plugins/modules
        "echasnovski/mini.nvim",
        config = function()
            -- Better Around/Inside textobjects
            --
            -- Examples:
            --  - va)  - [V]isually select [A]round [)]parenthen
            --  - yinq - [Y]ank [I]nside [N]ext [']quote
            --  - ci'  - [C]hange [I]nside [']quote
            require("mini.ai").setup { n_lines = 500 }

            -- Add/delete/replace surroundings (brackets, quotes, etc.)
            --
            -- - saiw) - [S]urround [A]dd [I]nner [W]ord [)]Paren
            -- - sd'   - [S]urround [D]elete [']quotes
            -- - sr)'  - [S]urround [R]eplace [)] [']
            require("mini.surround").setup()

            -- ... and there is more!
            --  Check out: https://github.com/echasnovski/mini.nvim
        end,
    },
}
