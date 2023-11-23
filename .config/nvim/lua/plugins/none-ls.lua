return {
    "nvimtools/none-ls.nvim",
    dependencies = {
        "williamboman/mason.nvim",
        {
            "ThePrimeagen/refactoring.nvim",
            dependencies = {
                "nvim-lua/plenary.nvim",
                "nvim-treesitter/nvim-treesitter",
            },
        },
    },
    opts = function(_, opts)
        local nls = require("null-ls")
        opts.root_dir = opts.root_dir
            or require("null-ls.utils").root_pattern(".null-ls-root", ".neoconf.json", "Makefile", ".git")
        opts.sources = vim.list_extend(opts.sources or {}, {
            -- Lua, Python, Typescript, Javascript, Go
            nls.builtins.code_actions.refactoring,

            -- Bash
            nls.builtins.code_actions.shellcheck,
        })
    end,
    keys = {
        {
            "<leader>ca",
            vim.lsp.buf.code_action,
            desc = "Code Action",
            mode = { "n", "v" },
        },
        {
            "<leader>fd",
            vim.lsp.buf.definition,
            desc = "Goto Definition",
            mode = { "n", "v" },
        },
        {
            "<leader>cd",
            vim.lsp.buf.declaration,
            desc = "Goto Declaration",
            mode = { "n", "v" },
        },
        {
            "<leader>cr",
            vim.lsp.buf.references,
            desc = "Goto References",
            mode = { "n", "v" },
        },
        {
            "<leader>ch",
            vim.lsp.buf.hover,
            desc = "Hover",
            mode = { "n", "v" },
        },
        {
            "<leader>ce",
            vim.lsp.buf.rename,
            desc = "Rename",
            mode = { "n", "v" },
        },
    }
}
