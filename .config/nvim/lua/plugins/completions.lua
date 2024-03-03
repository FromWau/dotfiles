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

        -- AI
        {
            "zbirenbaum/copilot-cmp",
            dependencies = "copilot.lua",
            opts = {},
            config = function(_, opts)
                local copilot_cmp = require "copilot_cmp"
                copilot_cmp.setup(opts)
            end,
        },
    },
    config = function()
        -- See `:help cmp`
        vim.api.nvim_set_hl(0, "CmpGhostText", { link = "Comment", default = true })
        local cmp = require "cmp"
        local luasnip = require "luasnip"
        luasnip.config.setup {}

        cmp.setup {
            snippet = {
                expand = function(args) luasnip.lsp_expand(args.body) end,
            },
            completion = { completeopt = "menu,menuone,noinsert" },

            -- For an understanding of why these mappings were
            -- chosen, you will need to read `:help ins-completion`
            mapping = cmp.mapping.preset.insert {
                -- Select the [n]ext item
                ["<C-n>"] = cmp.mapping.select_next_item(),
                -- Select the [p]revious item
                ["<C-N>"] = cmp.mapping.select_prev_item(),

                -- Accept ([y]es) the completion.
                --  This will auto-import if your LSP supports it.
                --  This will expand snippets if the LSP sent a snippet.
                ["<C-tab>"] = cmp.mapping.confirm { select = true },

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
                { name = "luasnip" },
                { name = "path" },
                { name = "copilot" },
            },
            experimental = {
                ghost_text = {
                    hl_group = "CmpGhostText",
                },
            },
        }
    end,
}
