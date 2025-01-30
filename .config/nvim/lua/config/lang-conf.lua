local lang_conf = {
    lua = {
        lsps = { "lua_ls" },
        formatters = { "stylua" },
    },
    sh = {
        lsps = { "bashls" },
        formatters = { "shfmt" },
    },
    typescript = {
        lsps = { "ts_ls" },
        formatters = { "prettierd", "prettier" },
    },
    rust = {
        lsp = {
            rust_analyzer = {
                settings = {
                    ["rust-analyzer"] = {
                        diagnostics = {
                            experimental = {
                                enable = true,
                            },
                        },
                        imports = {
                            granularity = {
                                group = "module",
                            },
                            prefix = "self",
                        },
                        cargo = {
                            allFeatures = true,
                            loadOutDirsFromCheck = true,
                            runBuildScripts = true,
                        },
                        checkOnSave = {
                            allFeatures = true,
                            command = "clippy",
                            extraArgs = { "--no-deps" },
                        },
                    },
                },
            },
        },
        formatter = { "rustfmt" },
    },
    -- python = {
    --     lsp = { "pyright" },
    --     formatter = { "black" },
    -- },
    --  kotlin = {
    --     lsp = { "kotlin_language_server" },
    --     formatter = { "ktlint" },
    -- },
    -- gradle = {
    --     lsp = { "gradle_ls" },
    --     formatter = {},
    -- },
    -- css = {
    --     lsp = { "cssls" },
    --     formatter = { "prettierd", "prettier" },
    -- },
    scss = {
        lsp = { "cssls" },
        formatter = { "prettierd", "prettier" },
    },
    toml = {
        lsps = { "taplo" },
        formatters = {},
    },
    json = {
        lsps = {},
        formatters = { "fixjson" },
    },
    yaml = {
        lsps = {},
        formatters = { "yamlfmt" },
    },
}

local lsps = {}
local formatters = {}

for language, config in pairs(lang_conf) do
    if config.lsps then lsps[language] = config.lsps end
    if config.formatters then formatters[language] = config.formatters end
end

return {
    lsps = lsps,
    formatters = formatters,
}
