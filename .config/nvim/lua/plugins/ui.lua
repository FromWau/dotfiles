return {
    {
        "nvim-lualine/lualine.nvim",
        dependencies = "nvim-tree/nvim-web-devicons",
        config = function()
            local navic = require "nvim-navic"
            local theme = require "lualine.themes.tokyonight"
            theme.normal.c.bg = nil

            require("lualine").setup {
                options = {
                    theme = theme,
                    globalstatus = true,
                    disabled_filetypes = {
                        statusline = { "Neotree", "dashboard" },
                    },
                },
                sections = {
                    lualine_a = { "mode" },
                    lualine_b = { "branch", "diff", "diagnostics" },
                    lualine_c = {
                        "filename",
                        {
                            function() return navic.get_location() end,
                            cond = function() return navic.is_available() end,
                        },
                    },
                    lualine_y = { "progress", "location" },
                    lualine_z = { { "datetime", style = "%H:%M" } },
                },
            }
        end,
    },

    {
        "ThePrimeagen/harpoon",
        config = function()
            require("harpoon").setup()
            require("telescope").load_extension "harpoon"
        end,
        dependencies = "nvim-lua/plenary.nvim",
        keys = {
            { "<leader>hm", function() require("harpoon.mark").add_file() end, desc = "mark" },
            { "<leader>hu", function() require("harpoon.mark").rm_file() end, desc = "unmark" },
            { "<leader>hl", function() require("harpoon.ui").toggle_quick_menu() end, desc = "show marks" },
            { "<leader>hn", function() require("harpoon.ui").nav_next() end, desc = "next mark" },
            { "<leader>hp", function() require("harpoon.ui").nav_prev() end, desc = "previous mark" },
        },
    },

    {
        "folke/noice.nvim",
        event = "VeryLazy",
        opts = { presets = { inc_rename = true } },
        dependencies = {
            "MunifTanjim/nui.nvim",
            {
                "rcarriga/nvim-notify",
                opts = {
                    stages = "slide",
                    timeout = 2000,
                },
            },
        },
        keys = {
            { "<leader>un", function() require("noice").cmd "dismiss" end, desc = "Dismiss noice" },
            { "<leader>uh", function() require("noice").cmd "telescope" end, desc = "Show noice history" },
        },
    },

    {
        "folke/which-key.nvim",
        event = "VeryLazy",
        config = function()
            local wk = require "which-key"
            wk.setup()
            wk.register {
                ["<leader>b"] = { name = "+Buffer", _ = "which_key_ignore" },
                ["<leader>c"] = { name = "+Code", _ = "which_key_ignore" },
                ["<leader>f"] = { name = "+Find", _ = "which_key_ignore" },
                ["<leader>g"] = { name = "+Git", _ = "which_key_ignore" },
                ["<leader>h"] = { name = "+Harpoon", _ = "which_key_ignore" },
                ["<leader>s"] = { name = "+Split Window", _ = "which_key_ignore" },
                ["<leader>u"] = { name = "+Ui", _ = "which_key_ignore" },
                ["<leader>x"] = { name = "+Trouble", _ = "which_key_ignore" },
            }
        end,
    },
}
