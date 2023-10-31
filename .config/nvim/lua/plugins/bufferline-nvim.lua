return {
	"akinsho/bufferline.nvim",
	lazy = false,
	config = function()
		require("bufferline").setup({
			options = {
				max_name_length = 25,
				separator_style = "slant",
				indicator = {
					style = "underline",
				},
			},
		})
	end,
	dependencies = "nvim-tree/nvim-web-devicons",
}
