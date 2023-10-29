return {
    "smjonas/inc-rename.nvim",
    lazy = false,
    config = function()
        require("inc_rename").setup()
    end,
    keys = {
        {
            "<leader>rn",
            function()
                return ":IncRename " .. vim.fn.expand("<cword>")
            end,
            desc = "[r]e[n]ame",
            mode = { "n" },
            expr = true,
        },
    },
}
