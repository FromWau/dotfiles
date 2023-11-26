return {
	"mfussenegger/nvim-lint",
	opts = {
		events = { "BufWritePost", "BufReadPost", "InsertLeave" },
		linters_by_ft = {
			lua = { "luacheck" },
			pyhon = { "pylint" },
			fish = { "fish" },
			sh = { "shellcheck" },
			javascript = { "tsserver" },
			typescript = { "tsserver" },
		},
	},
	config = function()
		vim.api.nvim_create_autocmd({ "BufWritePost" }, {
			callback = function()
				require("lint").try_lint()
			end,
		})
	end,
}
