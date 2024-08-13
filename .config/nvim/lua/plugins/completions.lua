return { -- Autocompletion
    "hrsh7th/nvim-cmp",
    event = "InsertEnter",
    dependencies = {
        -- Snippet Engine & its associated nvim-cmp source
        {
            "L3MON4D3/LuaSnip",
            build = (function()
                -- Build Step is needed for regex support in snippets.
                -- This step is not supported in many windows environments.
                -- Remove the below condition to re-enable on windows.
                if vim.fn.has "win32" == 1 or vim.fn.executable "make" == 0 then return end
                return "make install_jsregexp"
            end)(),
            dependencies = {
                {
                    "rafamadriz/friendly-snippets",
                    config = function() require("luasnip.loaders.from_vscode").lazy_load() end,
                },
                "benfowler/telescope-luasnip.nvim",
            },
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
                    suggestion = { enabled = false },
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
                -- Select item
                ["<C-n>"] = cmp.mapping.select_next_item(),
                ["<C-p>"] = cmp.mapping.select_prev_item(),

                -- Scroll the documentation window [b]ack / [f]orward
                ["<C-b>"] = cmp.mapping.scroll_docs(-4),
                ["<C-f>"] = cmp.mapping.scroll_docs(4),

                -- Accept ([y]es) the completion.
                --  This will auto-import if your LSP supports it.
                --  This will expand snippets if the LSP sent a snippet.
                ["<C-y>"] = cmp.mapping.confirm { select = true },
                ["<C-z>"] = cmp.mapping.confirm { select = true },

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
                { name = "lazydev", group_index = 0 }, -- NOTE: set group index to 0 to skip loading LuaLS completions as lazydev recommends it
                { name = "nvim_lsp" },
                { name = "copilot" },
                { name = "luasnip" },
                { name = "path" },
            },
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
