local tools = require("utils.lang").getTables()

local language_servers = tools.language_servers
local formatters = tools.formatters
local linters = tools.linters
local ensure_installed = tools.ensure_installed

return { -- LSP Configuration & Plugins
    "neovim/nvim-lspconfig",
    dependencies = {
        {
            "williamboman/mason.nvim",
            keys = { { "<leader>um", "<CMD>Mason<CR>", { desc = "Show Mason" } } },
        },
        "williamboman/mason-lspconfig.nvim",
        "WhoIsSethDaniel/mason-tool-installer.nvim",
        "j-hui/fidget.nvim",
        {
            "stevearc/conform.nvim",
            cmd = "ConformInfo",
            event = "BufWritePre",
            dependencies = "mason.nvim",
            lazy = true,
            opts = { formatters_by_ft = formatters },
        },
        {
            "SmiteshP/nvim-navic", -- Lualine show context
            opts = {
                highlight = true,
                click = true,
                use_diagnostic_signs = true,
            },
        },
    },
    config = function()
        vim.api.nvim_create_autocmd("LspAttach", {
            group = vim.api.nvim_create_augroup("lsp-attach", { clear = true }),
            callback = function(event)
                local nmap = require("utils.keymaps").nmap

                local nmap_buffer = function(keys, func, opts)
                    local options = { buffer = event.buf }
                    if opts then options = vim.tbl_extend("force", options, opts) end
                    nmap(keys, func, options)
                end

                -- Format
                nmap_buffer(
                    "<leader>cf",
                    function() require("conform").format { async = true, lsp_fallback = true } end,
                    { desc = "Format buffer" }
                )

                --  To jump back, press <C-T>.
                nmap_buffer("gd", require("telescope.builtin").lsp_definitions, { desc = "[G]oto [D]efinition" })
                nmap_buffer("gr", require("telescope.builtin").lsp_references, { desc = "[G]oto [R]eferences" })
                nmap_buffer("gi", require("telescope.builtin").lsp_implementations, { desc = "[G]oto [I]mplementation" })

                nmap_buffer("<leader>D", require("telescope.builtin").lsp_type_definitions, { desc = "Type [D]efinition" })

                -- Fuzzy find all the symbols in your current document.
                --  Symbols are things like variables, functions, types, etc.
                nmap_buffer("<leader>ds", require("telescope.builtin").lsp_document_symbols, { desc = "[D]ocument [S]ymbols" })

                -- Fuzzy find all the symbols in your current workspace
                --  Similar to document symbols, except searches over your whole project.
                nmap_buffer(
                    "<leader>ws",
                    require("telescope.builtin").lsp_dynamic_workspace_symbols,
                    { desc = "[W]orkspace [S]ymbols" }
                )
                nmap_buffer("<leader>rn", vim.lsp.buf.rename, { desc = "[R]e[n]ame" })

                nmap_buffer("<leader>ca", vim.lsp.buf.code_action, { desc = "[C]ode [A]ction" })

                nmap_buffer("K", vim.lsp.buf.hover, { desc = "Hover Documentation" })

                -- WARN: This is not Goto Definition, this is Goto Declaration.
                --  For example, in C this would take you to the header
                nmap_buffer("gD", vim.lsp.buf.declaration, { desc = "[G]oto [D]eclaration" })

                -- The following two autocommands are used to highlight references of the
                -- word under your cursor when your cursor rests there for a little while.
                --    See `:help CursorHold` for information about when this is executed
                --
                -- When you move your cursor, the highlights will be cleared (the second autocommand).
                local client = vim.lsp.get_client_by_id(event.data.client_id)
                if client and client.server_capabilities.documentHighlightProvider then
                    vim.api.nvim_create_autocmd({ "CursorHold", "CursorHoldI" }, {
                        buffer = event.buf,
                        callback = vim.lsp.buf.document_highlight,
                    })

                    vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI" }, {
                        buffer = event.buf,
                        callback = vim.lsp.buf.clear_references,
                    })
                end

                -- Show context in lualine
                if client and client.server_capabilities.documentSymbolProvider then
                    local navic = require "nvim-navic"
                    navic.attach(client, event.buf)
                end
            end,
        })

        -- LSP servers and clients are able to communicate to each other what features they support.
        --  By default, Neovim doesn't support everything that is in the LSP Specification.
        --  When you add nvim-cmp, luasnip, etc. Neovim now has *more* capabilities.
        --  So, we create new capabilities with nvim cmp, and then broadcast that to the servers.
        local capabilities = vim.lsp.protocol.make_client_capabilities()
        capabilities = vim.tbl_deep_extend("force", capabilities, require("cmp_nvim_lsp").default_capabilities())

        --  Add any additional override configuration in the following tables. Available keys are:
        --  - cmd (table): Override the default command used to start the server
        --  - filetypes (table): Override the default list of associated filetypes for the server
        --  - capabilities (table): Override fields in capabilities. Can be used to disable certain LSP features.
        --  - settings (table): Override the default settings passed when initializing the server.
        --        For example, to see the options for `lua_ls`, you could go to: https://luals.github.io/wiki/settings/

        -- Ensure the servers and tools above are installed
        require("mason").setup()
        require("mason-tool-installer").setup { ensure_installed = ensure_installed }

        require("mason-lspconfig").setup {
            handlers = {
                function(server_name)
                    local server = language_servers[server_name] or {}
                    require("lspconfig")[server_name].setup {
                        cmd = server.cmd,
                        settings = server.settings,
                        filetypes = server.filetypes,
                        -- This handles overriding only values explicitly passed
                        -- by the server configuration above. Useful when disabling
                        -- certain features of an LSP (for example, turning off formatting for tsserver)
                        capabilities = vim.tbl_deep_extend("force", {}, capabilities, server.capabilities or {}),
                    }
                end,
            },
        }
    end,
}
