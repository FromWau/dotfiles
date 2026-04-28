-- Godot external-editor integration.
-- godotdev.nvim owns the LSP + DAP wiring for .gd / .gdshader buffers,
-- so there is nothing to add to lang-conf.lua for this.
-- Enable the server in Godot: Editor Settings -> Network -> Language Server.
return {
    {
        "Mathijs-Bakker/godotdev.nvim",
        ft = { "gdscript", "gdshader" },
        dependencies = {
            "mfussenegger/nvim-dap",
            "rcarriga/nvim-dap-ui",
            "nvim-treesitter/nvim-treesitter",
        },
        opts = {},
    },
}
