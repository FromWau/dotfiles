return {
    "tpope/vim-sleuth", -- Detect tabstop and shiftwidth automatically

    {
        "folke/todo-comments.nvim", -- Highlight todo, notes, etc in comments (like this one)
        event = "VimEnter",
        dependencies = "nvim-lua/plenary.nvim",
        opts = { signs = true },
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

            hooks.register(hooks.type.WHITESPACE, hooks.builtin.hide_first_space_indent_level)

            vim.g.rainbow_delimiters = { highlight = highlight }
            require("ibl").setup {
                indent = { highlight = highlight },
                scope = { enabled = false },
                exclude = exclude,
            }
        end,
    },

    {
        "windwp/nvim-autopairs",
        event = "InsertEnter",
        dependencies = { "hrsh7th/nvim-cmp" },
        config = function()
            require("nvim-autopairs").setup {}
            -- If you want to automatically add `(` after selecting a function or method
            local cmp_autopairs = require "nvim-autopairs.completion.cmp"
            local cmp = require "cmp"
            cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
        end,
    },

    {
        "akinsho/toggleterm.nvim",
        version = "*",
        config = true,
    },

    {
        "folke/trouble.nvim",
        dependencies = { "nvim-tree/nvim-web-devicons" },
        opts = {},
        keys = {
            {
                "<leader>xx",
                function() require("trouble").toggle() end,
                desc = "Toggle Trouble",
            },
            {
                "<leader>xw",
                function() require("trouble").toggle "workspace_diagnostics" end,
                desc = "Show Workspace Diagnostics",
            },
            {
                "<leader>xd",
                function() require("trouble").toggle "document_diagnostics" end,
                desc = "Show Document Diagnostics",
            },
            {
                "<leader>xl",
                function() require("trouble").toggle "loclist" end,
                desc = "Show Loclist",
            },
            {
                "<leader>xq",
                function() require("trouble").toggle "quickfix" end,
                desc = "Show Quickfix",
            },
            {
                "<leader>xr",
                function() require("trouble").toggle "lsp_references" end,
                desc = "Show LSP References",
            },
            {
                "<leader>xn",
                function()
                    require("trouble").next { skip_groups = true, jump = true }
                    vim.cmd.normal "V"
                end,

                desc = "Next Trouble",
            },
            {
                "<leader>xp",
                function()
                    require("trouble").previous { skip_groups = true, jump = true }
                    vim.cmd.normal "V"
                end,
                desc = "Previous Trouble",
            },
        },
    },

    {
        "nvim-pack/nvim-spectre",
        dedendencies = "nvim-lua/plenary.nvim",
    },

    {
        "kevinhwang91/nvim-ufo",
        dependencies = "kevinhwang91/promise-async",
        config = function()
            local handler = function(virtText, lnum, endLnum, width, truncate)
                local newVirtText = {}
                local suffix = (" 󰁂 %d "):format(endLnum - lnum)
                local sufWidth = vim.fn.strdisplaywidth(suffix)
                local targetWidth = width - sufWidth
                local curWidth = 0
                for _, chunk in ipairs(virtText) do
                    local chunkText = chunk[1]
                    local chunkWidth = vim.fn.strdisplaywidth(chunkText)
                    if targetWidth > curWidth + chunkWidth then
                        table.insert(newVirtText, chunk)
                    else
                        chunkText = truncate(chunkText, targetWidth - curWidth)
                        local hlGroup = chunk[2]
                        table.insert(newVirtText, { chunkText, hlGroup })
                        chunkWidth = vim.fn.strdisplaywidth(chunkText)
                        -- str width returned from truncate() may less than 2nd argument, need padding
                        if curWidth + chunkWidth < targetWidth then
                            suffix = suffix .. (" "):rep(targetWidth - curWidth - chunkWidth)
                        end
                        break
                    end
                    curWidth = curWidth + chunkWidth
                end
                table.insert(newVirtText, { suffix, "MoreMsg" })
                return newVirtText
            end

            vim.o.foldlevel = 99
            vim.o.foldlevelstart = -1
            vim.o.foldenable = true

            require("ufo").setup {
                enable_get_fold_virt_text = true,
                fold_virt_text_handler = handler,
                filetype_exclude = { "gitsigns", "help", "dashboard", "neo-tree", "Trouble", "lazy", "mason" },
                open_fold_hl_timeout = 150,
                preview = {
                    win_config = {
                        border = { "", "─", "", "", "", "─", "", "" },
                        winhighlight = "Normal:Folded",
                        winblend = 0,
                    },
                },
            }
        end,
        keys = {
            { "<C-Kplus>", "zo", desc = "Open fold" },
            { "<C-Kminus>", "zc", desc = "Close fold" },
            { "<A-Kplus>", function() require("ufo").openAllFolds() end, desc = "Open all folds" },
            { "<A-Kminus>", function() require("ufo").closeAllFolds() end, desc = "Close all folds" },
            { "zr", function() require("ufo").openFoldsExceptKinds() end, desc = "Open folds" },
            { "zm", function() require("ufo").closeFoldsWith() end, desc = "Close folds" },
            {
                "zk",
                function()
                    local winid = require("ufo").peekFoldedLinesUnderCursor()
                    if not winid then vim.lsp.buf.hover() end
                end,
                desc = "Peek folded lines under cursor",
            },
        },
    },
}

-- TEST: Test some other maybe cool plugins:
-- - https://github.com/lewis6991/satellite.nvim
-- - https://github.com/ggandor/leap.nvim
-- - https://github.com/Wansmer/treesj
-- - https://github.com/znck/grammarly
-- - Testing: Find something that can run tests and show the results in a nice way
