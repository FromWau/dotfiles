return {
	"stevearc/conform.nvim",
	event = { "BufWritePre" },
	dependencies = { "mason.nvim" },
	lazy = true,
	cmd = "ConformInfo",
	opts = {
		formatters_by_ft = {
			lua = { "stylua" },
			python = { "black" },
			bash = { "shfmt" },
			javascript = { "prettierd", "prettier" },
			css = { "prettierd", "prettier" },
			scss = { "prettierd", "prettier" },
			kotlin = { "ktlint" },
		},
	},
	keys = {
		{
			"<leader>cf",
			function()
				require("conform").format({ async = true, lsp_fallback = true })
			end,
			mode = { "n", "v" },
			desc = "Format buffer",
		},
	},
}
