return { -- Highlight, edit, and navigate code
    "nvim-treesitter/nvim-treesitter",
    dependencies = { "nvim-treesitter/nvim-treesitter-textobjects" },
    build = ":TSUpdate",
    cmd = { "TSUpdateSync", "TSUpdate", "TSInstall" },
    config = function()
        -- [[ Configure Treesitter ]] See `:help nvim-treesitter`
        require("nvim-treesitter.configs").setup {
            ensure_installed = { "bash", "lua", "toml" },
            auto_install = true,
            highlight = { enable = true },
            indent = { enable = true },
        }
    end,
}
