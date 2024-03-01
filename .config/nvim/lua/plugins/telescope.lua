return {
    "nvim-telescope/telescope.nvim", -- Fuzzy Finder (files, lsp, etc)
    event = "VeryLazy",
    branch = "0.1.x",
    dependencies = {
        "nvim-lua/plenary.nvim",
        {
            "nvim-telescope/telescope-fzf-native.nvim",
            build = "make",
            -- `cond` is a condition used to determine whether this plugin should be installed and loaded.
            cond = function()
                return vim.fn.executable "make" == 1
            end,
        },
        "nvim-telescope/telescope-ui-select.nvim",
        "nvim-tree/nvim-web-devicons",
    },
    config = function()
        require("telescope").setup {
            defaults = {
                layout_strategy = "vertical",
                layout_config = {
                    vertical = {
                        prompt_position = "top",
                        width = 0.8,
                        preview_height = 0.6,
                    },
                },
                mappings = {
                    i = {
                        ["<c-enter>"] = "to_fuzzy_refine",

                        ["<ScrollWheelUp>"] = "preview_scrolling_up",
                        ["<c-up>"] = "preview_scrolling_up",
                        ["<ScrollWheelDown>"] = "preview_scrolling_down",
                        ["<c-down>"] = "preview_scrolling_down",
                    },
                },
            },
            pickers = {
                find_files = { hidden = true },
            },
        }

        -- Enable telescope extensions, if they are installed
        pcall(require("telescope").load_extension, "fzf")
        pcall(require("telescope").load_extension, "noice")

        local builtin = require "telescope.builtin"
        local keymap = vim.keymap

        keymap.set("n", "<leader>fh", builtin.help_tags, { desc = "[F]ind [H]elp" })
        keymap.set("n", "<leader>fk", builtin.keymaps, { desc = "[F]ind [K]eymaps" })
        keymap.set("n", "<leader>ff", builtin.find_files, { desc = "[F]ind [F]iles" })
        keymap.set("n", "<leader>fw", builtin.grep_string, { desc = "[F]ind current [W]ord" })
        keymap.set("n", "<leader>fg", builtin.live_grep, { desc = "[F]ind by [G]rep" })
        keymap.set("n", "<leader>fd", builtin.diagnostics, { desc = "[F]ind [D]iagnostics" })
        keymap.set("n", "<leader>fr", builtin.oldfiles, { desc = "[F]ind Recent Files" })
        keymap.set("n", "<leader><leader>", builtin.buffers, { desc = "[ ] Find existing buffers" })

        keymap.set("n", "<leader>/", function()
            builtin.current_buffer_fuzzy_find {
                layout_strategy = "center",
                layout_config = {
                    width = 0.8,
                    height = 0.7,
                },
                previewer = false,
            }
        end, { desc = "[/] Fuzzily search in current buffer" })

        keymap.set("n", "<leader>f/", function()
            builtin.live_grep {
                grep_open_files = true,
                prompt_title = "Live Grep in Open Files",
            }
        end, { desc = "[F]ind [/] in Open Files" })
    end,
}
