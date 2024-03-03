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
        linter = { "luacheck" },
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
}

local ensure_installed = {}
local formatters = {}
local linters = {}
local language_servers = {}

local function populateTables()
    local toolSet = {}

    local function insertEnsure(tbl)
        for _, tool_table in ipairs(tbl) do
            if type(tool_table) == "string" then
                if not toolSet[tool_table] then toolSet[tool_table] = true end
            elseif next(tool_table) ~= nil then
                for _, tool in ipairs(tool_table) do
                    if not toolSet[tool] then toolSet[tool] = true end
                end
            end
        end
    end

    for lang, langTools in pairs(tools) do
        if langTools.formatter then
            formatters[lang] = langTools.formatter
            insertEnsure(langTools.formatter)
        end
        if langTools.linter then
            linters[lang] = langTools.linter
            insertEnsure(langTools.linter)
        end
        if langTools.lsp then
            for server, config in pairs(langTools.lsp) do
                language_servers[server] = config
                if not toolSet[server] then toolSet[server] = true end
            end
        end
    end

    for k, _ in pairs(toolSet) do
        table.insert(ensure_installed, k)
    end
end
populateTables()

return { -- LSP Configuration & Plugins
    "neovim/nvim-lspconfig",
    dependencies = {
        "williamboman/mason.nvim",
        "williamboman/mason-lspconfig.nvim",
        "WhoIsSethDaniel/mason-tool-installer.nvim",
        "j-hui/fidget.nvim",
        {
            "stevearc/conform.nvim",
            cmd = "ConformInfo",
            event = "BufWritePre",
            dependencies = { "mason.nvim" },
            lazy = true,
            opts = {
                formatters_by_ft = formatters,
            },
        },
    },
    config = function()
        vim.api.nvim_create_autocmd("LspAttach", {
            group = vim.api.nvim_create_augroup("lsp-attach", { clear = true }),
            callback = function(event)
                -- Format
                vim.keymap.set(
                    "n",
                    "<leader>cf",
                    function() require("conform").format { async = true, lsp_fallback = true } end,
                    { buffer = event.buf, desc = "Format buffer" }
                )

                local map = function(keys, func, desc)
                    vim.keymap.set("n", keys, func, { buffer = event.buf, desc = "LSP: " .. desc })
                end

                --  To jump back, press <C-T>.
                map("gd", require("telescope.builtin").lsp_definitions, "[G]oto [D]efinition")
                map("gr", require("telescope.builtin").lsp_references, "[G]oto [R]eferences")
                map("gi", require("telescope.builtin").lsp_implementations, "[G]oto [I]mplementation")

                map("<leader>D", require("telescope.builtin").lsp_type_definitions, "Type [D]efinition")

                -- Fuzzy find all the symbols in your current document.
                --  Symbols are things like variables, functions, types, etc.
                map("<leader>ds", require("telescope.builtin").lsp_document_symbols, "[D]ocument [S]ymbols")

                -- Fuzzy find all the symbols in your current workspace
                --  Similar to document symbols, except searches over your whole project.
                map("<leader>ws", require("telescope.builtin").lsp_dynamic_workspace_symbols, "[W]orkspace [S]ymbols")
                map("<leader>rn", vim.lsp.buf.rename, "[R]e[n]ame")

                map("<leader>ca", vim.lsp.buf.code_action, "[C]ode [A]ction")

                map("K", vim.lsp.buf.hover, "Hover Documentation")

                -- WARN: This is not Goto Definition, this is Goto Declaration.
                --  For example, in C this would take you to the header
                map("gD", vim.lsp.buf.declaration, "[G]oto [D]eclaration")

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
