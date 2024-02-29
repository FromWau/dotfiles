return {
	"akinsho/bufferline.nvim",
	lazy = false,
	dependencies = { "nvim-tree/nvim-web-devicons", "echasnovski/mini.bufremove" },
	opts = {
		options = {
			close_command = function(n)
				require("mini.bufremove").delete(n, false)
			end,
			right_mouse_command = function(n)
				require("mini.bufremove").delete(n, false)
			end,
			max_name_length = 25,
			separator_style = "slant",
			indicator = {
				style = "underline",
			},
			offsets = {
				{
					filetype = "neo-tree",
					text = "File Explorer",
					highlight = "Directory",
					separator = true,
				},
			},
		},
	},
	keys = {
		{ "<leader>bn", "<cmd>bnext<CR>", desc = "Buffer Next" },
		{ "<leader>bp", "<cmd>bprevious<CR>", desc = "Buffer Previous" },
		{ "<leader>bb", "<cmd>e #<CR>", desc = "Buffer last" },
		{ "<leader>`", "<cmd>e #<CR>", desc = "Buffer last" },
		{ "<leader>bo", "<Cmd>BufferLineCloseOthers<CR>", desc = "Delete other buffers" },
		{ "[b", "<cmd>BufferLineCyclePrev<cr>", desc = "Prev buffer" },
		{ "]b", "<cmd>BufferLineCycleNext<cr>", desc = "Next buffer" },
		{ "<leader>br", "<Cmd>BufferLineCloseRight<CR>", desc = "Delete buffers to the right" },
		{ "<leader>bl", "<Cmd>BufferLineCloseLeft<CR>", desc = "Delete buffers to the left" },
	},
}
