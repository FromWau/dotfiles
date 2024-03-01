return { -- Highlight, edit, and navigate code
    "nvim-treesitter/nvim-treesitter",
    dependencies = {
        "nvim-treesitter/nvim-treesitter-textobjects",
        "nvim-treesitter/nvim-treesitter-context",
    },
    build = ":TSUpdate",
    cmd = { "TSUpdateSync", "TSUpdate", "TSInstall" },
    config = function()
        -- [[ Configure Treesitter ]] See `:help nvim-treesitter`

        ---@diagnostic disable-next-line: missing-fields
        require("nvim-treesitter.configs").setup {
            ensure_installed = { "bash", "lua", "toml" },
            auto_install = true,
            highlight = { enable = true },
            indent = { enable = true },
        }
    end,
}
