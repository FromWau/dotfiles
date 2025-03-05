local lang_conf = require "config.lang-conf"

return {
    -- Lsp
    {
        "neovim/nvim-lspconfig",
        dependencies = {
            {
                -- add nvim lua lib stuff for config
                "folke/lazydev.nvim",
                ft = "lua", -- only load on lua files
                opts = {
                    library = {
                        -- See the configuration section for more details
                        -- Load luvit types when the `vim.uv` word is found
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
            -- Filter out kulala_ls -> can not installed via mason for now
            local ensure_installed = {}
            local x = lang_conf.lsps
            for _, server in ipairs(x) do
                if server ~= "kulala_ls" then table.insert(ensure_installed, server) end
            end

            require("mason").setup {}
            require("mason-lspconfig").setup {
                ensure_installed = ensure_installed,
                -- ensure_installed = lang_conf.lsps,
                automatic_installation = true,
            }

            local capabilities = vim.lsp.protocol.make_client_capabilities()
            capabilities = vim.tbl_deep_extend("force", capabilities, require("blink.cmp").get_lsp_capabilities())

            for _, servers in pairs(lang_conf.lsps) do
                for server, config_table in pairs(servers) do
                    require("lspconfig")[server].setup {
                        capabilities = capabilities,
                        settings = config_table,
                    }
                end
            end

            vim.api.nvim_create_autocmd("LspAttach", {
                callback = function(args)
                    local client = vim.lsp.get_client_by_id(args.data.client_id)
                    if not client then
                        vim.api.nvim_echo({
                            { "No lsp client on attach", "ErrorMsg" },
                        }, true, {})
                        return
                    end

                    if client.supports_method "textDocument/codeAction" then
                        vim.keymap.set("n", "<leader>ca", function() vim.lsp.buf.code_action() end, { desc = "Code action" })
                    end

                    if client.supports_method "textDocument/rename" then
                        vim.keymap.set("n", "<leader>cr", function() vim.lsp.buf.rename() end, { desc = "Code rename" })
                    end

                    if client.supports_method "textDocument/definition" then
                        vim.keymap.set("n", "gd", function() vim.lsp.buf.definition() end, { desc = "Goto definition" })
                    end

                    if client.supports_method "textDocument/typeDefinition" then
                        vim.keymap.set("n", "gD", function() vim.lsp.buf.type_definition() end, { desc = "Goto type definition" })
                    end

                    if client.supports_method "textDocument/references" then
                        vim.keymap.set("n", "gr", function() vim.lsp.buf.references() end, { desc = "Goto references" })
                    end

                    if client.supports_method "textDocument/implementation" then
                        vim.keymap.set("n", "gi", function() vim.lsp.buf.implementation() end, { desc = "Goto implementation" })
                    end

                    if client.supports_method "textDocument/hover" then
                        vim.keymap.set("n", "K", function() vim.lsp.buf.hover() end, { desc = "Hover" })
                    end

                    if client.supports_method "textDocument/inlayHint" then
                        vim.keymap.set("n", "<leader>ch", function() vim.lsp.buf.inlay_hints() end, { desc = "Inlay hints" })
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
                formatters_by_ft = lang_conf.formatters,
                default_format_opts = {
                    lsp_format = "fallback",
                },
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
