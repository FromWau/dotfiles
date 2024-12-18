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
        linter = {},
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
                        -- Add clippy lints for Rust.
                        checkOnSave = {
                            allFeatures = true,
                            command = "clippy",
                            extraArgs = { "--no-deps" },
                        },
                        procMacro = {
                            enable = true,
                            ignored = {
                                ["async-trait"] = { "async_trait" },
                                ["napi-derive"] = { "napi" },
                                ["async-recursion"] = { "async_recursion" },
                            },
                        },
                    },
                },
            },
        },
        formatter = { "rustfmt" }, -- use plugin instead
        linter = {}, -- use plugin instead
    },
    typescript = {
        lsp = { ts_ls = {} },
        formatter = { { "prettierd", "prettier" } },
        linter = { "eslint" },
    },
    javascript = {
        lsp = { ts_ls = {} },
        formatter = { { "prettierd", "prettier" } },
        linter = { "eslint" },
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
    gradle = {
        lsp = { gradle_ls = {} },
        formatter = {},
        linter = {},
    },
    json = {
        lsp = {
            jsonls = {
                settings = {
                    json = {
                        schemas = require("schemastore").json.schemas(),
                        validate = { enable = true },
                    },
                },
            },
        },
        formatter = { "fixjson" },
        linter = {},
    },
    yaml = {
        lsp = {
            yamlls = {
                settings = {
                    yaml = {
                        schemaStore = {
                            enable = false,
                            url = "",
                        },
                        schemas = require("schemastore").yaml.schemas(),
                    },
                },
            },
        },
        formatter = { "yamlfmt" },
        linter = {},
    },
    toml = {
        lsp = { taplo = {} },
        formatter = {},
        linter = {},
    },
}

return tools
