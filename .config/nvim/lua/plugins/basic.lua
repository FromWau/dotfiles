return {
    "tpope/vim-sleuth", -- Detect tabstop and shiftwidth automatically
    {
        "folke/todo-comments.nvim", -- Highlight todo, notes, etc in comments (like this one)
        dependencies = "nvim-lua/plenary.nvim",
        opts = true,
        -- TODO: Add keymaps to navigate through todos and show all todos
        -- and maybe better symbols for todo and test
    },

    {
        "numToStr/Comment.nvim", -- Commenting
        opts = {
            mappings = {
                basic = false, -- Disable default mappings (gcc)
                extra = false, -- Disable extra mappings (gcA)
            },
        },
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
        "lewis6991/gitsigns.nvim", -- Show Git changes in the sign column and enable line blame
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

    {
        "echasnovski/mini.nvim", -- A collection of small, focused plugins
        lazy = false,
        config = function()
            -- Better Around/Inside textobjects
            --
            -- Examples:
            --  - va)  - [V]isually select [A]round [)]parenthen
            --  - yinq - [Y]ank [I]nside [N]ext [']quote
            --  - ci'  - [C]hange [I]nside [']quote
            require("mini.ai").setup { n_lines = 500 }

            -- Create colorscheme
            -- TODO: Look into this
            -- https://github.com/echasnovski/mini.nvim/blob/main/readmes/mini-base16.md
            -- require('mini.base16').setup()

            -- Better Buffer deletion
            require("mini.bufremove").setup()

            -- Move lines and blocks of text
            require("mini.move").setup {
                mappings = {
                    left = "<A-left>",
                    right = "<A-right>",
                    down = "<A-down>",
                    up = "<A-up>",

                    line_left = "<A-left>",
                    line_right = "<A-right>",
                    line_down = "<A-down>",
                    line_up = "<A-up>",
                },
            }

            -- Highlight colors with its color
            local hipatterns = require "mini.hipatterns"
            hipatterns.setup {
                highlighters = {
                    -- Highlight hex color strings (#rrggbb) using that color
                    hex_color = hipatterns.gen_highlighter.hex_color(),
                },
            }

            -- Add/delete/replace surroundings (brackets, quotes, etc.)
            require("mini.surround").setup()
        end,
        keys = {
            {
                "<leader>bd",
                function()
                    local bd = require("mini.bufremove").delete
                    if vim.bo.modified then
                        local choice = vim.fn.confirm(("Save changes to %q?"):format(vim.fn.bufname()), "&Yes\n&No\n&Cancel")
                        if choice == 1 then -- Yes
                            vim.cmd.write()
                            bd(0)
                        elseif choice == 2 then -- No
                            bd(0, true)
                        end
                    else
                        bd(0)
                    end
                end,
                desc = "Delete Buffer",
            },
            { "<leader>bD", function() require("mini.bufremove").delete(0, true) end, desc = "Delete Buffer (Force)" },
        },
    },

    {
        "folke/tokyonight.nvim",
        lazy = false,
        priority = 1000,
        config = function()
            -- Load the colorscheme here
            vim.cmd.colorscheme "tokyonight-night"

            -- You can configure highlights by doing something like
            vim.cmd.hi "Comment gui=none"
        end,
    },

    -- FIXME: Check if it works correctly
    {
        "lukas-reineke/indent-blankline.nvim",
        dependencies = {
            "HiPhish/rainbow-delimiters.nvim",
            config = function()
                local rainbow_delimiters = require "rainbow-delimiters"
                require("rainbow-delimiters.setup").setup {
                    strategy = { [""] = rainbow_delimiters.strategy["global"] },
                    query = { [""] = "rainbow-blocks" },
                }
            end,
        },
        main = "ibl",
        config = function()
            local highlight = {
                "RainbowRed",
                "RainbowYellow",
                "RainbowBlue",
                "RainbowOrange",
                "RainbowGreen",
                "RainbowViolet",
                "RainbowCyan",
            }
            local exclude = {
                filetypes = {
                    "help",
                    "dashboard",
                    "neo-tree",
                    "Trouble",
                    "trouble",
                    "lazy",
                    "mason",
                    "notify",
                    "toggleterm",
                    "lazyterm",
                },
            }

            local hooks = require "ibl.hooks"

            hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
                vim.api.nvim_set_hl(0, "RainbowRed", { fg = "#E06C75" })
                vim.api.nvim_set_hl(0, "RainbowYellow", { fg = "#E5C07B" })
                vim.api.nvim_set_hl(0, "RainbowBlue", { fg = "#61AFEF" })
                vim.api.nvim_set_hl(0, "RainbowOrange", { fg = "#D19A66" })
                vim.api.nvim_set_hl(0, "RainbowGreen", { fg = "#98C379" })
                vim.api.nvim_set_hl(0, "RainbowViolet", { fg = "#C678DD" })
                vim.api.nvim_set_hl(0, "RainbowCyan", { fg = "#56B6C2" })
            end)

            vim.g.rainbow_delimiters = { highlight = highlight }
            require("ibl").setup {
                indent = { highlight = highlight },
                scope = { enabled = false },
                exclude = exclude,
            }
        end,
    },

    -- TEST: Test some other maybe cool plugins:
    -- - https://github.com/lewis6991/satellite.nvim
    -- - https://github.com/ggandor/leap.nvim
    -- - https://github.com/windwp/nvim-autopairs
    -- - https://github.com/Wansmer/treesj
    -- - Testing: Find something that can run tests and show the results in a nice way
    -- - Terminal: Find a terminal plugin
}
