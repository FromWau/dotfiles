return {
    {
        "nvim-lualine/lualine.nvim",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        config = function()
            local theme = require "lualine.themes.tokyonight"
            theme.normal.c.bg = nil

            require("lualine").setup {
                options = {
                    theme = theme,
                    globalstatus = true,
                    disabled_filetypes = {
                        statusline = { "Neotree" },
                    },
                },
                sections = {
                    lualine_y = { { "location" } },
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
        dependencies = {
            "nvim-lua/plenary.nvim",
        },
        keys = {
            {
                "<leader>hm",
                function()
                    require("harpoon.mark").add_file()
                end,
                desc = "mark",
            },
            {
                "<leader>hu",
                function()
                    require("harpoon.mark").rm_file()
                end,
                desc = "unmark",
            },
            {
                "<leader>hl",
                function()
                    require("harpoon.ui").toggle_quick_menu()
                end,
                desc = "show marks",
            },
            {
                "<leader>hn",
                function()
                    require("harpoon.ui").nav_next()
                end,
                desc = "next mark",
            },
            {
                "<leader>hp",
                function()
                    require("harpoon.ui").nav_prev()
                end,
                desc = "previous mark",
            },
        },
    },

    {
        "folke/noice.nvim",
        event = "VeryLazy",
        opts = {},
        config = function()
            require("noice").setup {
                presets = { inc_rename = true },
            }
        end,
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
            {
                "<leader>un",
                function()
                    require("noice").cmd "dismiss"
                end,
                desc = "Dismiss noice",
            },

            {
                "<leader>uh",
                function()
                    require("noice").cmd "telescope"
                end,
                desc = "Show noice history",
            },
        },
    },
}
