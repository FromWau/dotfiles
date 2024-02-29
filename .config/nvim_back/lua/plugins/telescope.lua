return {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    dependencies = {
        "nvim-lua/plenary.nvim",
        {
            "nvim-telescope/telescope-fzf-native.nvim",
            build = "make",
            enabled = vim.fn.executable("make") == 1,
        },
    },
    opts = {
        defaults = {
            focusable = true,
            layout_config = {
                horizontal = {
                    prompt_position = "bottom",
                    preview_width = 0.55,
                    results_width = 0.8,
                },
            },
            mappings = {
                i = {
                    ["<C-j>"] = "move_selection_next",
                    ["<C-k>"] = "move_selection_previous",

                    ["<ScrollWheelUp>"] = "preview_scrolling_up",
                    ["<ScrollWheelDown>"] = "preview_scrolling_down",
                },
            },
        },
        pickers = {
            previewer = true,
            find_files = {
                previewer = true,
                hidden = true,
            },
            live_grep = {
                previewer = true,
            },
            buffers = {
                previewer = true,
            },
        },
        extensions = { "projects" },
    },
    keys = {
        { "<leader>fk", "<cmd>Telescope keymaps<CR>",    desc = "[F]ind [K]eymaps" },
        { "<leader>fh", "<cmd>Telescope help_tags<CR>",  desc = "[F]ind [H]elp tags" },
        { "<leader>ff", "<cmd>Telescope find_files<CR>", desc = "[F]ind [F]iles" },
        { "<leader>fg", "<cmd>Telescope live_grep<CR>",  desc = "[F]ind [G]rep" },
        { "<leader>fr", "<cmd>Telescope oldfiles<CR>",   desc = "[F]ind [R]ecent files" },
        { "<leader>fb", "<cmd>Telescope buffers<CR>",    desc = "[F]ind [B]uffers" },
        { "<leader>fp", "<Cmd>Telescope projects<CR>",   desc = "[F]ind [P]rojects" },
    },
}
