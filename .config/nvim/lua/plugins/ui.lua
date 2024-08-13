return {
    {
        "nvim-lualine/lualine.nvim",
        dependencies = {
            "nvim-tree/nvim-web-devicons",
            "SmiteshP/nvim-navic",
        },
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
                    lualine_x = {
                        "encoding",
                        "fileformat",
                        "filetype",
                        {
                            require("noice").api.status.mode.get,
                            cond = require("noice").api.status.mode.has,
                            color = { fg = "#ff9e64" },
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
        "smjonas/inc-rename.nvim",
        config = function() require("inc_rename").setup() end,
        keys = {
            { "<leader>r", ":IncRename ", desc = "Rename" },
        },
    },

    {
        "folke/noice.nvim",
        event = "VeryLazy",
        opts = {
            presets = { inc_rename = true },
            lsp = { signature = { enabled = false } }, -- Disable warning, lsp_signature overrides
        },
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
        event = "VimEnter",
        config = function()
            require("which-key").setup()

            require("which-key").add {
                { "<leader>b", group = "[B]uffer" },
                { "<leader>c", group = "[C]ode" },
                { "<leader>f", group = "[F]ind", icon = " " },
                { "<leader>r", group = "[R]ename" },
                { "<leader>g", group = "[G]it", icon = " ", mode = { "n", "v" } },
                { "<leader>h", group = "[H]arpoon" },
                { "<leader>s", group = "[S]plit Window" },
                { "<leader>u", group = "[U]i" },
                { "<leader>x", group = "Trouble" },
                { "<leader>t", group = "[T]oogle" },
            }
        end,
    },
}
