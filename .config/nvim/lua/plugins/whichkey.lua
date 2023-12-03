return {
	"folke/which-key.nvim",
	event = "VeryLazy",
	config = function(_, opts)
		local wk = require("which-key")
		wk.setup(opts)
		wk.register(opts.defaults)
		wk.register({
			-- Pane and Window Navigation
			["<C-h>"] = { "<C-w>h", "Navigate Left" },
			["<C-Left>"] = { "<C-w>h", "Navigate Left" },
			["<C-j>"] = { "<C-w>j", "Navigate Down" },
			["<C-Down>"] = { "<C-w>j", "Navigate Down" },
			["<C-k>"] = { "<C-w>k", "Navigate Up" },
			["<C-Up>"] = { "<C-w>k", "Navigate Up" },
			["<C-l>"] = { "<C-w>l", "Navigate Right" },
			["<C-Right>"] = { "<C-w>l", "Navigate Right" },
		}, { mode = "n", prefix = "" })

		wk.register({
			-- Clear search with <esc>
			["<esc>"] = { "<cmd>noh<cr><esc>", "Escape and clear hlsearch" },
		}, { mode = { "n", "i" }, prefix = "" })

		wk.register({
			-- Indenting
			["<"] = { "<gv", "Shift Indentation to Left" },
			[">"] = { ">gv", "Shift Indentation to Right" },

			-- Paste over selection without yanking
            -- p = { '"_dp' },
            -- P = { '"_dP' },
		}, { mode = "v", prefix = "" })

		wk.register({
			-- Window Management
			s = {
				name = "Split window",
				v = { "<cmd>vsplit<CR>", "Vertically" },
				h = { "<cmd>split<CR>", "Horizontally" },
				m = { "<cmd>MaximizerToggle<CR>", "Minimise" },
			},

			-- Lazy
			l = { "<cmd>Lazy<CR>", "[L]azy" },
		}, { mode = "n", prefix = "<leader>" })
	end,
	opts = {
		plugins = { spelling = true },
		defaults = {
			mode = { "n", "v" },
			["gs"] = { name = "+Surround" },
			["]"] = { name = "+next" },
			["["] = { name = "+prev" },
			["<leader>b"] = { name = "+Buffer" },
			["<leader>c"] = { name = "+Code" },
			["<leader>f"] = { name = "+File/Find" },
			["<leader>s"] = { name = "+Search" },
			["<leader>u"] = { name = "+Ui" },
			["<leader>h"] = { name = "+Harpoon" },
			["<leader>x"] = { name = "+Trouble" },
		},
	},
}
