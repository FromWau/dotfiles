-- Docs https://www.lazyvim.org/plugins/colorscheme

return {
    { "folke/tokyonight.nvim" },

    {
        "LazyVim/LazyVim",
        opts = {
            transparent = true,
            colorscheme = "tokyonight-night",
            style = {
                sidebars = "transparent",
                floats = "transparent",
            },
        },
    },
}
