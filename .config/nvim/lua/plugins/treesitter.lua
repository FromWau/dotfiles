-- nvim-treesitter main branch (archived master is broken on Neovim 0.12).
-- Upstream explicitly does NOT support lazy-loading, so this must load eagerly.
-- The main branch compiles parsers from source, so it needs the `tree-sitter`
-- CLI. We bootstrap it via Mason so the config stays self-contained.
local parsers = {
    "lua",
    "vim",
    "vimdoc",
    "query",
    "markdown",
    "markdown_inline",
    "hyprlang",
    "gdscript",
    "gdshader",
    "godot_resource",
    "kotlin",
}

local function install_parsers_when_ready()
    local function do_install() require("nvim-treesitter").install(parsers) end

    if vim.fn.executable "tree-sitter" == 1 then return do_install() end

    local ok, mr = pcall(require, "mason-registry")
    if not ok then
        vim.notify("[treesitter] mason-registry unavailable; cannot bootstrap tree-sitter-cli", vim.log.levels.ERROR)
        return
    end

    local pkg_ok, pkg = pcall(mr.get_package, "tree-sitter-cli")
    if not pkg_ok then
        vim.notify("[treesitter] tree-sitter-cli not in mason registry", vim.log.levels.ERROR)
        return
    end

    if pkg:is_installed() then return do_install() end

    vim.notify("[treesitter] installing tree-sitter-cli via Mason...", vim.log.levels.INFO)
    pkg:install():once("closed", vim.schedule_wrap(function()
        if pkg:is_installed() then
            do_install()
        else
            vim.notify("[treesitter] tree-sitter-cli install failed", vim.log.levels.ERROR)
        end
    end))
end

return {
    {
        "nvim-treesitter/nvim-treesitter",
        branch = "main",
        lazy = false,
        build = ":TSUpdate",
        dependencies = { "williamboman/mason.nvim" },
        config = function()
            require("nvim-treesitter").setup {
                install_dir = vim.fn.stdpath "data" .. "/site",
            }

            install_parsers_when_ready()

            vim.api.nvim_create_autocmd("FileType", {
                callback = function(args)
                    local ok = pcall(vim.treesitter.start)
                    if ok then vim.bo[args.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()" end
                end,
            })
        end,
    },

    {
        "nvim-treesitter/nvim-treesitter-textobjects",
        branch = "main",
        dependencies = { "nvim-treesitter/nvim-treesitter" },
        event = "VeryLazy",
        config = function()
            require("nvim-treesitter-textobjects").setup {
                select = {
                    lookahead = true,
                    include_surrounding_whitespace = true,
                },
            }

            local select = require "nvim-treesitter-textobjects.select"
            local swap = require "nvim-treesitter-textobjects.swap"

            vim.keymap.set(
                { "x", "o" },
                "af",
                function() select.select_textobject("@function.outer", "textobjects") end,
                { desc = "a function" }
            )
            vim.keymap.set(
                { "x", "o" },
                "if",
                function() select.select_textobject("@function.inner", "textobjects") end,
                { desc = "inner function" }
            )
            vim.keymap.set(
                { "x", "o" },
                "ac",
                function() select.select_textobject("@class.outer", "textobjects") end,
                { desc = "a class" }
            )
            vim.keymap.set(
                { "x", "o" },
                "ic",
                function() select.select_textobject("@class.inner", "textobjects") end,
                { desc = "inner class" }
            )

            vim.keymap.set(
                "n",
                "<leader>a",
                function() swap.swap_next "@parameter.inner" end,
                { desc = "Swap param with next" }
            )
            vim.keymap.set(
                "n",
                "<leader>A",
                function() swap.swap_previous "@parameter.inner" end,
                { desc = "Swap param with prev" }
            )
        end,
    },
}
