local config = function()
    require('illuminate').configure({
        providers = {
            'lsp',
            'treesitter',
            'regex',
        },
        delay = 100,
        filetypes_denylist = {
            'dirbuf',
            'dirvish',
            'fugitive',
        },
        under_cursor = true,
        large_file_cutoff = nil,
        large_file_overrides = nil,
        min_count_to_highlight = 1,
    })
end

return {
    "RRethy/vim-illuminate",
    lazy = false,
    config = config
}
