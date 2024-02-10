return {
	"williamboman/mason.nvim",
	cmd = "Mason",
	build = ":MasonUpdate",
	keys = { { "<leader>cm", "<cmd>Mason<cr>", desc = "Mason" } },
	opts = {
		ensure_installed = {
			-- Lua
			"lua-language-server", --Lsp
			"luacheck", --Linter
			"stylua", --Format
			-- Python
			"pyright", --Lsp
			"pylint", --Linter
			"black", --Format
			-- Bash
			"bash-language-server", --Lsp
			"shellcheck", --Linter
			"shfmt", --Format
			-- Javascript/Typescript
			"typescript-language-server", --Lsp
			"prettier", --Format
			"prettierd", --Format Daemon
            -- Css / Scss
            "css-lsp", --Lsp
            "stylelint", --Linter
			"prettier", --Format
			"prettierd", --Format Daemon
            -- Kotlin
            "kotlin-language-server", --Lsp
            "ktlint", --Linter
            "ktlint", --Format
            -- Rust
            "rust-analyzer", --Lsp
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
