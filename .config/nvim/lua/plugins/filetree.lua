return {
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    cmd = "Neotree",
    config = function()
        vim.cmd [[hi NeoTreeNormal guibg=NONE ctermbg=None]]
        require("neo-tree").setup {
            filesystem = {
                filtered_items = {
                    hide_dotfiles = false,
                    hide_gitignored = false,
                    hide_hidden = false,
                },
            },
        }
    end,
    dependencies = {
        "nvim-lua/plenary.nvim",
        "nvim-tree/nvim-web-devicons",
        "MunifTanjim/nui.nvim",
        "3rd/image.nvim",
    },
    init = function()
        if vim.fn.argc(-1) == 1 then
            local stat = vim.loop.fs_stat(vim.fn.argv(0))
            if stat and stat.type == "directory" then
                require "neo-tree"
            end
        end
    end,
    keys = {
        { "<leader>e", "<cmd>Neotree toggle<CR>", desc = "NeoTree Toggle" },
        { "<leader>E", "<cmd>Neotree show<CR>", desc = "NeoTree Show" },
    },
}
