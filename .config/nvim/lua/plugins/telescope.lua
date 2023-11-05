local keymap = vim.keymap

local config = function()
	require("telescope").setup({
		defaults = {
			focusable = true,
			layout_config = {
				horizontal = {
					prompt_position = "bottom",
					preview_width = 0.55,
					results_width = 0.8,
				},
			},
			mappings = {
				i = {
					["<C-j>"] = "move_selection_next",
					["<C-k>"] = "move_selection_previous",

					["<ScrollWheelUp>"] = "preview_scrolling_up",
					["<ScrollWheelDown>"] = "preview_scrolling_down",
				},
			},
		},
		pickers = {
			previewer = true,
			find_files = {
				previewer = true,
				hidden = true,
			},
			live_grep = {
				previewer = true,
			},
			buffers = {
				previewer = true,
			},
		},
		extensions = {},
	})
end

return {
	"nvim-telescope/telescope.nvim",
	tag = "0.1.4",
	lazy = false,
	dependencies = { "nvim-lua/plenary.nvim" },
	config = config,
	keys = {
		keymap.set("n", "<leader>fk", ":Telescope keymaps<CR>"),
		keymap.set("n", "<leader>fh", ":Telescope help_tags<CR>"),
		keymap.set("n", "<leader>ff", ":Telescope find_files<CR>"),
		keymap.set("n", "<leader>fg", ":Telescope live_grep<CR>"),
		keymap.set("n", "<leader>fb", ":Telescope buffers<CR>"),
	},
}
