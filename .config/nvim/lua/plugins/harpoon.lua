return {
	"ThePrimeagen/harpoon",
	lazy = false,
	config = function()
		require("harpoon").setup()
		require("telescope").load_extension("harpoon")
	end,
	depencies = {
		"nvim-lua/plenary.nvim",
	},
	keys = {
		{ "<leader>hm", "<cmd>lua require('harpoon.mark').add_file()<CR>", desc = "harpoon mark" },
		{ "<leader>hu", "<cmd>lua require('harpoon.mark').rm_file()<CR>", desc = "harpoon unmark" },
		{ "<leader>hl", "<cmd>Telescope harpoon marks<CR>", desc = "harpoon show marks" },
		{ "<leader>hn", "<cmd>lua require('harpoon.ui').nav_next()<CR>", desc = "harpoon next mark" },
		{ "<leader>hp", "<cmd>lua require('harpoon.ui').nav_prev()<CR>", desc = "harpoon previous mark" },
	},
}
