local lang_conf = {
    lua = {
        lsps = { lua_ls = {} },
        formatters = { stylua = {} },
    },
    sh = {
        lsps = { bashls = {} },
        formatters = { shfmt = {} },
    },
    typescript = {
        lsps = { ts_ls = {} },
        formatters = { prettierd = {}, prettier = {} },
    },
    rust = {
        lsps = {
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
        formatters = { rustfmt = {} },
    },
    python = {
        lsps = { pyright = {} },
        formatters = { black = {} },
    },
    scss = {
        lsps = { cssls = {} },
        formatters = { prettierd = {}, prettier = {} },
    },
    toml = {
        lsps = { taplo = {} },
        formatters = {},
    },
    json = {
        lsps = { biome = {} },
        formatters = { biome = {} },
    },
    yaml = {
        lsps = {},
        formatters = {
            yamlfmt = {
                prepend_args = {
                    "-formatter", "type=basic",
                    "-formatter", "include_document_start=true",
                    "-formatter", "eof_newline=true",
                    "-formatter", "indent=2",
                    "-formatter", "retain_line_breaks=true",
                    "-formatter", "trim_trailing_whitespace=true",
                },
            },
        },
    },
    http = {
        lsps = { kulala_ls = {} }, -- install on system: npm install -g @mistweaverco/kulala-ls
        formatters = { ["kulala-fmt"] = {} },
    },
}

local lsps, formatters, formatters_by_ft = {}, {}, {}

for ft, config in pairs(lang_conf) do
    for server, opts in pairs(config.lsps or {}) do
        if opts.settings then
            lsps[server] = { settings = opts.settings }
        else
            lsps[server] = nil
        end
    end

    formatters_by_ft[ft] = {}
    for fmt, opts in pairs(config.formatters or {}) do
        table.insert(formatters_by_ft[ft], fmt)
        formatters[fmt] = opts
    end
end

return {
    lsps = lsps,
    formatters = formatters,
    formatters_by_ft = formatters_by_ft,
}
