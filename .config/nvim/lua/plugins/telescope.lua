return {
    "nvim-telescope/telescope.nvim", -- Fuzzy Finder (files, lsp, etc)
    event = "VeryLazy",
    branch = "0.1.x",
    dependencies = {
        "nvim-lua/plenary.nvim",
        {
            "nvim-telescope/telescope-fzf-native.nvim",
            build = "make",
            cond = function() return vim.fn.executable "make" == 1 end,
        },
        "nvim-telescope/telescope-ui-select.nvim",
        "nvim-tree/nvim-web-devicons",
        { "nvim-telescope/telescope-media-files.nvim", dependencies = "nvim-lua/popup.nvim" },
    },
    config = function()
        local trouble = require "trouble.providers.telescope"

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
                        ["<ScrollWheelUp>"] = "preview_scrolling_up",
                        ["<c-up>"] = "preview_scrolling_up",
                        ["<ScrollWheelDown>"] = "preview_scrolling_down",
                        ["<c-down>"] = "preview_scrolling_down",
                        ["<c-t>"] = trouble.open_with_trouble,
                    },
                    n = { ["<c-t>"] = trouble.open_with_trouble },
                },
            },
            pickers = {
                find_files = { hidden = true },
                current_buffer_fuzzy_find = { sorting_strategy = "ascending" },
            },
            extensions = {
                media_files = {
                    filetypes = { "png", "webp", "jpg", "jpeg", "pdf" },
                },
            },
        }

        -- Enable telescope extensions, if they are installed
        pcall(require("telescope").load_extension, "fzf")
        pcall(require("telescope").load_extension, "noice")
        pcall(require("telescope").load_extension, "media_files")

        local builtin = require "telescope.builtin"
        local nmap = require("utils.keymaps").nmap

        nmap(
            "<leader>fc",
            function()
                builtin.find_files {
                    cwd = "~/.config/nvim/",
                }
            end,
            { desc = "[F]ind [C]onfig files" }
        )
        nmap("<leader>fh", builtin.help_tags, { desc = "[F]ind [H]elp" })
        nmap("<leader>fk", builtin.keymaps, { desc = "[F]ind [K]eymaps" })
        nmap("<leader>ff", builtin.find_files, { desc = "[F]ind [F]iles" })
        nmap("<leader>fw", builtin.grep_string, { desc = "[F]ind current [W]ord" })
        nmap("<leader>fg", builtin.live_grep, { desc = "[F]ind by [G]rep" })
        nmap("<leader>fd", builtin.diagnostics, { desc = "[F]ind [D]iagnostics" })
        nmap("<leader>fr", builtin.oldfiles, { desc = "[F]ind Recent Files" })
        nmap("<leader><leader>", builtin.buffers, { desc = "[ ] Find existing buffers" })

        nmap(
            "<leader>/",
            function()
                builtin.current_buffer_fuzzy_find {
                    layout_strategy = "vertical",
                    layout_config = { width = 0.8, height = 0.7 },
                    previewer = false,
                }
            end,
            { desc = "[/] Fuzzily search in current buffer" }
        )

        nmap(
            "<leader>f/",
            function()
                builtin.live_grep {
                    grep_open_files = true,
                    prompt_title = "Live Grep in Open Files",
                }
            end,
            { desc = "[F]ind [/] in Open Files" }
        )
    end,
}
