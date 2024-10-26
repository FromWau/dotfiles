return {
    "nvim-telescope/telescope.nvim", -- Fuzzy Finder (files, lsp, etc)
    event = "VimEnter",
    branch = "0.1.x",
    dependencies = {
        "nvim-lua/plenary.nvim",
        {
            "nvim-telescope/telescope-fzf-native.nvim",
            build = "make",
            cond = function() return vim.fn.executable "make" == 1 end,
        },
        "nvim-telescope/telescope-ui-select.nvim",
        { "nvim-tree/nvim-web-devicons", enabled = vim.g.have_nerd_font },
        { "nvim-telescope/telescope-media-files.nvim", dependencies = "nvim-lua/popup.nvim" },
    },
    config = function()
        local trouble = require "trouble.sources.telescope"

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
                        ["<c-t>"] = trouble.open,
                    },
                    n = { ["<c-t>"] = trouble.open },
                },
            },
            pickers = {
                find_files = { hidden = false },
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
        pcall(require("telescope").load_extension, "ui-select")
        pcall(require("telescope").load_extension, "noice")
        pcall(require("telescope").load_extension, "media_files")
        pcall(require("telescope").load_extension "advanced_git_search")
        pcall(require("telescope").load_extension "neoclip")

        local builtin = require "telescope.builtin"
        local function nmap(keys, func, opts) vim.keymap.set("n", keys, func, opts) end

        nmap("<leader>fh", builtin.help_tags, { desc = "[F]ind [H]elp" })
        nmap("<leader>fk", builtin.keymaps, { desc = "[F]ind [K]eymaps" })
        nmap("<leader>ff", builtin.find_files, { desc = "[F]ind [F]iles" })
        nmap("<leader>fw", builtin.grep_string, { desc = "[F]ind current [W]ord" })
        nmap("<leader>fg", builtin.live_grep, { desc = "[F]ind by [G]rep" })
        nmap("<leader>fd", builtin.diagnostics, { desc = "[F]ind [D]iagnostics" })
        nmap("<leader>fR", builtin.resume, { desc = "[F]ind [R]esume" })
        nmap("<leader>fr", builtin.oldfiles, { desc = "[F]ind [r]ecent Files" })
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

        nmap(
            "<leader>fc",
            function() builtin.find_files { cwd = vim.fn.stdpath "config" } end,
            { desc = "[F]ind [C]onfig files" }
        )
    end,
}
