local lang_conf = require "config.lang-conf"

return {
    -- Lsp: in Neovim 0.11+ configuration uses vim.lsp.config + vim.lsp.enable.
    -- nvim-lspconfig is kept purely for the default server configs it ships in
    -- runtime `lsp/<name>.lua` (auto-loaded via runtimepath); we layer our own
    -- settings on top of those defaults.
    {
        "neovim/nvim-lspconfig",
        dependencies = {
            {
                "folke/lazydev.nvim",
                ft = "lua",
                opts = {
                    library = {
                        { path = "${3rd}/luv/library", words = { "vim%.uv" } },
                        { path = "snacks.nvim", words = { "Snacks" } },
                    },
                },
            },
            {
                "williamboman/mason.nvim",
                config = true,
                keys = {
                    { "<leader>um", "<CMD>Mason<CR>", desc = "Open Mason" },
                },
            },
            "saghen/blink.cmp",
            "williamboman/mason-lspconfig.nvim",
        },
        config = function()
            local servers = vim.tbl_keys(lang_conf.lsps)

            -- Mason cannot install system-only LSPs (e.g. kulala_ls).
            local mason_servers = vim.tbl_filter(function(s) return s ~= "kulala_ls" end, servers)

            require("mason").setup {}
            require("mason-lspconfig").setup {
                ensure_installed = mason_servers,
                automatic_installation = true,
            }

            -- Global capabilities for every server: nvim defaults + blink.cmp extras.
            vim.lsp.config("*", {
                capabilities = vim.tbl_deep_extend(
                    "force",
                    vim.lsp.protocol.make_client_capabilities(),
                    require("blink.cmp").get_lsp_capabilities()
                ),
            })

            -- Per-server overrides merged over nvim-lspconfig's defaults.
            for name, opts in pairs(lang_conf.lsps) do
                if opts and opts.settings then vim.lsp.config(name, { settings = opts.settings }) end
            end

            vim.lsp.enable(servers)

            vim.api.nvim_create_autocmd("LspAttach", {
                callback = function(args)
                    local client = vim.lsp.get_client_by_id(args.data.client_id)
                    if not client then return end

                    local function buf_map(lhs, rhs, desc) vim.keymap.set("n", lhs, rhs, { buffer = args.buf, desc = desc }) end

                    if client:supports_method "textDocument/codeAction" then
                        buf_map("<leader>ca", function() vim.lsp.buf.code_action() end, "Code action")
                    end
                    if client:supports_method "textDocument/rename" then
                        buf_map("<leader>cr", function() vim.lsp.buf.rename() end, "Code rename")
                    end
                    if client:supports_method "textDocument/definition" then
                        buf_map("gd", function() vim.lsp.buf.definition() end, "Goto definition")
                    end
                    if client:supports_method "textDocument/typeDefinition" then
                        buf_map("gD", function() vim.lsp.buf.type_definition() end, "Goto type definition")
                    end
                    if client:supports_method "textDocument/references" then
                        buf_map("gr", function() vim.lsp.buf.references() end, "Goto references")
                    end
                    if client:supports_method "textDocument/implementation" then
                        buf_map("gi", function() vim.lsp.buf.implementation() end, "Goto implementation")
                    end
                    if client:supports_method "textDocument/hover" then
                        buf_map("K", function() vim.lsp.buf.hover() end, "Hover")
                    end
                    if client:supports_method "textDocument/inlayHint" then
                        buf_map(
                            "<leader>ch",
                            function()
                                vim.lsp.inlay_hint.enable(
                                    not vim.lsp.inlay_hint.is_enabled { bufnr = args.buf },
                                    { bufnr = args.buf }
                                )
                            end,
                            "Toggle inlay hints"
                        )
                    end
                end,
            })
        end,
    },

    -- Formatting
    {
        "stevearc/conform.nvim",
        dependencies = {
            { "williamboman/mason.nvim", config = true },
            "zapling/mason-conform.nvim",
        },
        event = { "BufWritePre" },
        cmd = { "ConformInfo" },
        config = function()
            require("mason").setup {}
            require("mason-conform").setup {}

            require("conform").setup {
                formatters_by_ft = lang_conf.formatters_by_ft,
                formatters = lang_conf.formatters,
                default_format_opts = { lsp_format = "fallback" },
            }

            vim.keymap.set("", "<leader>cf", function() require("conform").format { async = true } end, { desc = "Format code" })
        end,
    },

    { --Markdown
        "MeanderingProgrammer/render-markdown.nvim",
        opts = {},
        dependencies = { "nvim-treesitter/nvim-treesitter", "nvim-tree/nvim-web-devicons" },
    },

    { -- Rust
        "saecki/crates.nvim",
        tag = "stable",
        event = { "BufRead Cargo.toml" },
        config = function() require("crates").setup {} end,
    },
}
