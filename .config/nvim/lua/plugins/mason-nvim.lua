return {
    "williamboman/mason.nvim",
    cmd = "Mason",
    build = ":MasonUpdate",
    keys = { { "<leader>cm", "<cmd>Mason<cr>", desc = "Mason" } },
    opts = {
        ensure_installed = {
            -- Lua
            "lua-language-server",  --Lsp
            "luacheck",             --Linter
            "luaformatter",         --Format

            -- Python
            "pyright",              --Lsp
            "pylint",               --Linter
            "black",                --Format
            -- Bash
            "bash-language-server", --Lsp
            "shellcheck",           --Linter
            "shfmt",                --Format
        },
    },
    config = function(_, opts)
        require("mason").setup(opts)
        local mr = require("mason-registry")
        local function ensure_installed()
            for _, tool in ipairs(opts.ensure_installed) do
                local p = mr.get_package(tool)
                if not p:is_installed() then
                    p:install()
                end
            end
        end
        if mr.refresh then
            mr.refresh(ensure_installed)
        else
            ensure_installed()
        end
    end,
}
