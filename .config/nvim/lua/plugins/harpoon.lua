return {
	"ThePrimeagen/harpoon",
	lazy = false,
	config = function()
		require("harpoon").setup()
		require("telescope").load_extension("harpoon")
	end,

	dependencies = {
		"nvim-lua/plenary.nvim",
	},
}
