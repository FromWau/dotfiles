return {
    "saghen/blink.cmp",
    version = "*",
    dependencies = {
        "rafamadriz/friendly-snippets",
        "giuxtaposition/blink-cmp-copilot",
        "xzbdmw/colorful-menu.nvim",
        {
            "Kaiser-Yang/blink-cmp-dictionary",
            dependencies = { "nvim-lua/plenary.nvim" },
        },
    },
    opts = {
        sources = {
            default = { "lsp", "dictionary", "path", "snippets", "buffer", "copilot", "dadbod", "markdown" },
            providers = {
                copilot = {
                    name = "copilot",
                    module = "blink-cmp-copilot",
                    score_offset = 100,
                    async = true,
                    transform_items = function(_, items)
                        items = items or {}
                        local CompletionItemKind = require("blink.cmp.types").CompletionItemKind
                        local kind_idx = #CompletionItemKind + 1
                        CompletionItemKind[kind_idx] = "Copilot"
                        for _, item in ipairs(items) do
                            item.kind = kind_idx
                        end

                        return items
                    end,
                },
                dadbod = {
                    name = "Dadbod",
                    module = "vim_dadbod_completion.blink",
                },
                markdown = {
                    name = "RenderMarkdown",
                    module = "render-markdown.integ.blink",
                    fallbacks = { "lsp" },
                },
                dictionary = {
                    module = "blink-cmp-dictionary",
                    name = "Dict",
                    min_keyword_length = 5,
                    opts = {
                        dictionary_files = {
                            vim.fn.expand "/usr/share/hunspell/de_AT.dic",
                            vim.fn.expand "/usr/share/hunspell/en_US.dic",
                            vim.fn.expand "~/.config/nvim/dict/custom_words.txt",
                        },
                        separate_output = function(output)
                            local items = {}
                            -- Iterate over each line in the output
                            for line in output:gmatch "[^\r\n]+" do
                                -- Extract the base word before the '/' and insert it into items
                                local word = line:match "([^/]+)" -- Match everything before '/'
                                if word then table.insert(items, word) end
                            end
                            return items
                        end,
                    },
                },
            },
        },

        keymap = {
            preset = "none",
            ["<C-space>"] = { "show", "show_documentation", "hide_documentation" },
            ["<C-e>"] = { "hide" },
            ["<C-y>"] = { "select_and_accept" },
            ["<C-z>"] = { "select_and_accept" },
            ["<Up>"] = { "select_prev", "fallback" },
            ["<Down>"] = { "select_next", "fallback" },
            ["<C-b>"] = { "scroll_documentation_up", "fallback" },
            ["<C-f>"] = { "scroll_documentation_down", "fallback" },
            ["<Tab>"] = { "snippet_forward", "fallback" },
            ["<S-Tab>"] = { "snippet_backward", "fallback" },
        },

        signature = { enabled = false },

        completion = {
            documentation = {
                auto_show = true,
                auto_show_delay_ms = 250,
                treesitter_highlighting = true,
                window = {
                    border = "rounded",
                },
            },

            ghost_text = {
                enabled = true,
                show_with_selection = true,
                show_without_selection = false,
            },

            list = {
                selection = {
                    preselect = false,
                    auto_insert = false,
                },
            },

            menu = {
                draw = {
                    columns = {
                        { "label", "label_description", gap = 2 },
                        { "kind_icon", "kind", gap = 1 },
                    },
                    components = {
                        label = {
                            text = function(ctx) return require("colorful-menu").blink_components_text(ctx) end,
                            highlight = function(ctx) return require("colorful-menu").blink_components_highlight(ctx) end,
                        },
                    },
                },
            },
        },

        appearance = {
            use_nvim_cmp_as_default = true,
            nerd_font_variant = "mono",
            kind_icons = {
                Copilot = "",
                Text = "󰉿",
                Method = "󰊕",
                Function = "󰊕",
                Constructor = "󰒓",

                Field = "󰜢",
                Variable = "󰆦",
                Property = "󰖷",

                Class = "󱡠",
                Interface = "󱡠",
                Struct = "󱡠",
                Module = "󰅩",

                Unit = "󰪚",
                Value = "󰦨",
                Enum = "󰦨",
                EnumMember = "󰦨",

                Keyword = "󰻾",
                Constant = "󰏿",

                Snippet = "󱄽",
                Color = "󰏘",
                File = "󰈔",
                Reference = "󰬲",
                Folder = "󰉋",
                Event = "󱐋",
                Operator = "󰪚",
                TypeParameter = "󰬛",
            },
        },
    },
}
