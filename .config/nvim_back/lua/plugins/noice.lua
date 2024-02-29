return {
	"folke/noice.nvim",
	event = "VeryLazy",
	opts = {},
	config = function()
		require("noice").setup({
			presets = { inc_rename = true },
		})
	end,
	dependencies = {
		"MunifTanjim/nui.nvim",
		{
			"rcarriga/nvim-notify",
			config = function()
				require("notify").setup({
					background_colour = "#000000",
				})
			end,
		},
	},
	keys = {
		{
			"<leader>un",
			"<cmd>Noice dismiss<CR>",
			desc = "Dismiss noice",
		},
	},
}
