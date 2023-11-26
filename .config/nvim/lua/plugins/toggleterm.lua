return {
    "akinsho/toggleterm.nvim",
    opts = {},
    keys = {
        { "<leader>tt", "<cmd>ToggleTerm<CR>", desc = "Toggle terminal" },
        {
            "<leader>tl",
            function()
                local Terminal = require('toggleterm.terminal').Terminal
                local lazygit  = Terminal:new({ cmd = "lazygit", hidden = true })

               lazygit:toggle()
            end,
            desc = "Toggle lazygit"
        },
    },
}
