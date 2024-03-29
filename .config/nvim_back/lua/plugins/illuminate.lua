return {
    "RRethy/vim-illuminate",
    opts = {
        providers = {
            "lsp",
            "treesitter",
            "regex",
        },
        delay = 100,
        filetypes_denylist = {
            "dirbuf",
            "dirvish",
            "lazygit",
            "toggleterm",
            "Neotree",
            "dashboard",
        },
        under_cursor = true,
        large_file_cutoff = nil,
        large_file_overrides = nil,
        min_count_to_highlight = 1,
    },
    config = function(_, opts)
        require("illuminate").configure(opts)
    end
}
