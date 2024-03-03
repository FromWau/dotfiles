return { -- Highlight, edit, and navigate code
    "nvim-treesitter/nvim-treesitter",
    dependencies = "nvim-treesitter/nvim-treesitter-textobjects",
    build = ":TSUpdate",
    cmd = { "TSUpdateSync", "TSUpdate", "TSInstall" },
    opts = {
        ensure_installed = { "bash", "lua", "toml" },
        auto_install = true,
        highlight = { enable = true },
        indent = { enable = true },
    },
}
