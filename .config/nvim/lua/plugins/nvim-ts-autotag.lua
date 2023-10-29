local config = function()
	require("nvim-treesitter.configs").setup({
		autotag = {
			enable = true,
		},
	})
end

return {
	"windwp/nvim-ts-autotag",
	lazy = false,
	config = config,
	dependencies = {
		"nvim-treesitter/nvim-treesitter",
	},
}
