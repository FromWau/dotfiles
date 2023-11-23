return {
    "neovim/nvim-lspconfig",
    dependencies = {
        {
            "folke/neoconf.nvim",
            cmd = "Neoconf",
            config = false,
            dependencies = { "neovim/nvim-lspconfig" }
        },
        { "folke/neodev.nvim", opts = {} },
        "williamboman/mason.nvim",
        "williamboman/mason-lspconfig.nvim",
    },
    config = function()
        local lspconfig = require("lspconfig")
        lspconfig.pyright.setup {}
        lspconfig.lua_ls.setup {}
        lspconfig.bashls.setup {}
    end,
}
