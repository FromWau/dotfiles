return {
    "nvim-treesitter/nvim-treesitter",
    dependencies = {
        "nvim-treesitter/nvim-treesitter-textobjects",
        "nvim-treesitter/nvim-treesitter-context",
        "windwp/nvim-ts-autotag",
    },
    build = ":TSUpdate",
    cmd = { "TSUpdateSync", "TSUpdate", "TSInstall" },
    config = function()
        require("nvim-treesitter.configs").setup {
            ensure_installed = {
                "lua",
                "python",
                "bash",
                "vim",
                "regex",
                "markdown"
            },
            indent = {
                enable = true,
            },
            autotag = {
                enable = true,
            },
        }
    end
}
