local config = function()
    local theme = require("lualine.themes.nightfox")
    theme.normal.c.bg = nil

    require("lualine").setup({
        options = {
            theme = theme,
            globalstatus = true,
            disabled_filetypes = {
                statusline = { "Neotree" },
            },
        },
        sections = {
            lualine_c = {
                {
                    function()
                        return require("nvim-navic").get_location()
                    end,
                    cond = function()
                        return package.loaded["nvim-navic"] and require("nvim-navic").is_available()
                    end,
                }
            }
        },
    })
end

return {
    "nvim-lualine/lualine.nvim",
    dependencies = {
        "nvim-tree/nvim-web-devicons",
    },
    config = config,
}
