return { -- Autocompletion
    "hrsh7th/nvim-cmp",
    event = "InsertEnter",
    dependencies = {
        -- Snippet Engine & its associated nvim-cmp source
        {
            "L3MON4D3/LuaSnip",
            build = vim.fn.has "win32" ~= 0 and "make install_jsregexp" or nil,
            dependencies = {
                "rafamadriz/friendly-snippets",
                "benfowler/telescope-luasnip.nvim",
            },
            config = function(_, opts)
                local snip = require "luasnip"
                if opts then snip.config.setup(opts) end

                vim.tbl_map(
                    function(type) require("luasnip.loaders.from_" .. type).lazy_load() end,
                    { "vscode", "snipmate", "lua" }
                )

                -- friendly-snippets - enable standardized comments snippets
                snip.filetype_extend("typescript", { "tsdoc" })
                snip.filetype_extend("javascript", { "jsdoc" })
                snip.filetype_extend("lua", { "luadoc" })
                snip.filetype_extend("python", { "pydoc" })
                snip.filetype_extend("rust", { "rustdoc" })
                snip.filetype_extend("cs", { "csharpdoc" })
                snip.filetype_extend("java", { "javadoc" })
                snip.filetype_extend("kotlin", { "kdoc" })
                snip.filetype_extend("sh", { "shelldoc" })
            end,
        },
        "saadparwaiz1/cmp_luasnip",

        -- Adds other completion capabilities.
        --  nvim-cmp does not ship with all sources by default. They are split
        --  into multiple repos for maintenance purposes.
        "hrsh7th/cmp-nvim-lsp",
        "hrsh7th/cmp-path",
        "onsails/lspkind.nvim", -- Adds icons to completion menu

        -- AI
        {
            "zbirenbaum/copilot-cmp",
            config = function() require("copilot_cmp").setup() end,
            dependencies = {
                "zbirenbaum/copilot.lua",
                cmd = "Copilot",
                build = ":Copilot auth",
                event = "InsertEnter",
                opts = {
                    suggestion = { enabled = false, },
                    panel = { enabled = false },
                    filetypes = {
                        help = false,
                        gitcommit = false,
                        gitrebase = false,
                        ["."] = false,
                    },
                },
            },
        },
    },
    config = function()
        -- See `:help cmp`
        local lspkind = require "lspkind"
        lspkind.init { symbol_map = { Copilot = "" } }
        vim.api.nvim_set_hl(0, "CmpItemKindCopilot", { fg = "#6CC644" })

        local cmp = require "cmp"
        local luasnip = require "luasnip"
        luasnip.config.setup {}

        vim.api.nvim_set_hl(0, "CmpGhostText", { link = "Comment", default = true })

        cmp.setup {
            snippet = { expand = function(args) luasnip.lsp_expand(args.body) end },
            completion = { completeopt = "menu,menuone,noinsert" },
            mapping = cmp.mapping.preset.insert {
                ["<C-n>"] = cmp.mapping.select_next_item(),
                ["<C-p>"] = cmp.mapping.select_prev_item(),

                -- Accept ([y]es) the completion.
                --  This will auto-import if your LSP supports it.
                --  This will expand snippets if the LSP sent a snippet.
                ["<C-y>"] = cmp.mapping.confirm { select = true },

                -- Think of <c-l> as moving to the right of your snippet expansion.
                --  So if you have a snippet that's like:
                --  function $name($args)
                --    $body
                --  end
                --
                -- <c-l> will move you to the right of each of the expansion locations.
                -- <c-h> is similar, except moving you backwards.
                ["<C-right>"] = cmp.mapping(function()
                    if luasnip.expand_or_locally_jumpable() then luasnip.expand_or_jump() end
                end, { "i", "s" }),
                ["<C-left>"] = cmp.mapping(function()
                    if luasnip.locally_jumpable(-1) then luasnip.jump(-1) end
                end, { "i", "s" }),
            },
            sources = {
                { name = "nvim_lsp" },
                { name = "copilot" },
                { name = "luasnip" },
                { name = "path" },
            },
            experimental = { ghost_text = { hl_group = "CmpGhostText" } },
            formatting = {
                format = lspkind.cmp_format {
                    mode = "text_symbol", -- options: 'text', 'text_symbol', 'symbol_text', 'symbol'
                    maxwidth = function() return math.floor(0.45 * vim.o.columns) end,
                    ellipsis_char = "...",
                    show_labelDetails = true,
                },
            },
        }
    end,
}
