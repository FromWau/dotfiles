return {
	"neovim/nvim-lspconfig",
	dependencies = {
		{
			"folke/neoconf.nvim",
			cmd = "Neoconf",
			config = false,
			dependencies = { "neovim/nvim-lspconfig" },
		},
		{ "folke/neodev.nvim", opts = {} },
		"williamboman/mason.nvim",
		"williamboman/mason-lspconfig.nvim",
	},
	config = function()
		local lspconfig = require("lspconfig")
		-- All Servers: https://github.com/neovim/nvim-lspconfig/blob/master/doc/server_configurations.md
		lspconfig.pyright.setup({})
		lspconfig.lua_ls.setup({})
		lspconfig.bashls.setup({})
		lspconfig.tsserver.setup({
			init_options = {
				hostInfo = "neovim",
				maxTsServerMemory = "8192",
				preferences = { quotePreference = "single", allowIncompleteCompletions = false },
			},
			settings = {
				documentFormatting = false,
				typescript = {
					inlayHints = {
						includeInlayParameterNameHints = "all",
						includeInlayParameterNameHintsWhenArgumentMatchesName = false,
						includeInlayFunctionParameterTypeHints = true,
						includeInlayVariableTypeHints = true,
						includeInlayPropertyDeclarationTypeHints = true,
						includeInlayFunctionLikeReturnTypeHints = true,
						includeInlayEnumMemberValueHints = true,
					},
				},
			},
			keys = {
				{
					"<leader>co",
					function()
						vim.lsp.buf.code_action({
							apply = true,
							context = {
								only = { "source.organizeImports.ts" },
								diagnostics = {},
							},
						})
					end,
					desc = "Organize Imports",
				},
			},
			{
				"<leader>cO",
				function()
					vim.lsp.buf.code_action({
						apply = true,
						context = {
							only = { "source.removeUnused.ts" },
							diagnostics = {},
						},
					})
				end,
				desc = "Remove Unused Imports",
			},
		})
		lspconfig.cssls.setup({})
	end,
}
