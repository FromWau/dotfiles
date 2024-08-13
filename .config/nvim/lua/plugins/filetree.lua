return {
    "nvim-neo-tree/neo-tree.nvim",
    version = "*",
    cmd = "Neotree",
    dependencies = {
        "nvim-lua/plenary.nvim",
        "nvim-tree/nvim-web-devicons",
        "MunifTanjim/nui.nvim",
        "3rd/image.nvim",
    },
    keys = {
        { "<leader>e", "<cmd>Neotree toggle<CR>", desc = "NeoTree Toggle" },
        { "<leader>E", "<cmd>Neotree show<CR>", desc = "NeoTree Show" },
    },
    config = function()
        vim.cmd [[hi NeoTreeNormal guibg=NONE ctermbg=None]]
        require("neo-tree").setup {
            filesystem = {
                filtered_items = {
                    hide_dotfiles = false,
                    hide_gitignored = true,
                    hide_hidden = false,
                },
            },
        }
    end,
}
