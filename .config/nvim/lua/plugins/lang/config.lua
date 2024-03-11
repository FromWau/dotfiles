-- ... etc. See `:help lspconfig-all` for a list of all the pre-configured LSPs
local tools = {
    python = {
        lsp = { pyright = {} },
        formatter = { "black" },
        linter = { "pylint" },
    },
    lua = {
        lsp = {
            lua_ls = {
                settings = {
                    Lua = {
                        runtime = { version = "LuaJIT" },
                        workspace = {
                            checkThirdParty = false,
                            library = { "${3rd}/luv/library", unpack(vim.api.nvim_get_runtime_file("", true)) },
                        },
                        completion = { callSnippet = "Replace" },
                    },
                },
            },
        },
        formatter = { "stylua" },
        linter = { "selene" },
    },
    rust = {
        lsp = { rust_analyzer = {} },
        formatter = {}, -- use plugin instead
        linter = {}, -- use plugin instead
    },
    typescript = {
        lsp = { tsserver = {} },
        formatter = { { "prettierd", "prettier" } },
        linter = {},
    },
    javascript = {
        lsp = { tsserver = {} },
        formatter = { { "prettierd", "prettier" } },
        linter = {},
    },
    bash = {
        lsp = { bashls = {} },
        formatter = { "shfmt" },
        linter = { "shellcheck" },
    },
    sh = {
        lsp = { bashls = {} },
        formatter = { "shfmt" },
        linter = { "shellcheck" },
    },
    css = {
        lsp = { cssls = {} },
        formatter = { { "prettierd", "prettier" } },
        linter = { "stylelint" },
    },
    scss = {
        lsp = { cssls = {} },
        formatter = { { "prettierd", "prettier" } },
        linter = { "stylelint" },
    },
    java = {
        lsp = { jdtls = {} },
        formatter = {},
        linter = {},
    },
    kotlin = {
        lsp = { kotlin_language_server = {} },
        formatter = { "ktlint" },
        linter = { "ktlint" },
    },
    toml = {
        lsp = { taplo = {} },
        formatter = {},
        linter = {},
    },
    gradle = {
        lsp = { gradle_ls = {} },
        formatter = {},
        linter = {},
    },
}

return tools
