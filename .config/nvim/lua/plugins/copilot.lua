return {
    "zbirenbaum/copilot.lua",
    dependencies = "zbirenbaum/copilot-cmp",
    cmd = "Copilot",
    build = ":Copilot auth",
    event = "InsertEnter",
    config = function()
        require("copilot").setup({
            suggestion = {
                enabled = true,
                auto_trigger = true,
            },
            panel = { enabled = false },
            filetypes = {
                markdown = true,
                lua = true,
                text = true,
                yaml = true,
                json = true,
                python = true,
                help = false,
                gitcommit = false,
                gitrebase = false,
                ["."] = false,
            },
        })

        require("copilot_cmp").setup({
            formatters = {
                insert_text = require("copilot_cmp.format").remove_existing,
            },
        })
    end,
}
