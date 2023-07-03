-- Docs https://www.lazyvim.org/plugins/colorscheme

return {
    -- { "folke/tokyonight.nvim" },
    --
    -- {
    --     "LazyVim/LazyVim",
    --     opts = {
    --         transparent = true,
    --         colorscheme = "tokyonight-night",
    --         style = {
    --             sidebars = "transparent",
    --             floats = "transparent",
    --         },
    --     },
    -- },

    "catppuccin/nvim",
    lazy = false,
    name = "catppuccin",
    build = ":CatppuccinCompile",
    config = function()
        require("catppuccin").setup({
            compile_path = vim.fn.stdpath("cache") .. "/catppuccin",
            transparent_background = true,
            dim_inactive = {
                enabled = true,
                shade = "dark",
                percentage = 0.15,
            },
            integrations = {
                cmp = true,
                integration = {
                    dap = {
                        enabled = true,
                        enable_ui = true, -- enable nvim-dap-ui
                    },
                },
                gitsigns = true,
                harpoon = true,
                indent_blankline = {
                    enabled = true,
                },
                leap = true,
                mason = true,
                native_lsp = {
                    enabled = true,
                },
                nvimtree = false,
                telescope = true,
                treesitter = true,
                treesitter_context = true,
            },
        })
        vim.cmd.colorscheme("catppuccin")
    end,
}
