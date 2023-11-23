return {
    "stevearc/dressing.nvim",
    lazy = true,
    init = function()
        vim.ui.select = function(...)
            require("dressing")
            return vim.ui.select(...)
        end
        vim.ui.input = function(...)
            require("dressing")
            return vim.ui.input(...)
        end
    end
}
