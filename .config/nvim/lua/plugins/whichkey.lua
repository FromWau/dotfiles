local config = function()
	local wk = require("which-key")
	wk.setup()

	wk.register({
		-- Pane and Window Navigation
		["<C-h>"] = { "<C-w>h", "Navigate Left" },
		["<C-j>"] = { "<C-w>j", "Navigate Down" },
		["<C-k>"] = { "<C-w>k", "Navigate Up" },
		["<C-l>"] = { "<C-w>l", "Navigate Right" },

		-- Comments
		["<C-/>"] = { "<Plug>(comment_toggle_linewise_current) j", "Comment Line" },
		["<C-kdivide>"] = { "<Plug>(comment_toggle_linewise_current) j", "Comment Line" },
	}, { mode = "n", prefix = "" })

	wk.register({
		-- Indenting
		["<"] = { "<gv", "Shift Indentation to Left" },
		[">"] = { ">gv", "Shift Indentation to Right" },

		-- Comments
		["<C-/>"] = { "<Plug>(comment_toggle_linewise_visual)", "Comment Line" },
		["<C-kdivide>"] = { "<Plug>(comment_toggle_linewise_visual)", "Comment Line" },
	}, { mode = "v", prefix = "" })

	wk.register({
		-- Buffer Navigation
		b = {
			name = "Buffer",
			n = { "<cmd>bnext<CR>", "next" },
			p = { "<cmd>bprevious<CR>", "previous" },
			d = { "<cmd>bdelete<CR>", "delete" },
			b = { "<cmd>e #<CR>", "last" },
		},
		["`"] = { "<cmd>e #<CR>", "Buffer last" },

		-- Directory Naviagtion
		e = { "<cmd>Neotree toggle<CR>", "NeoTree Toggle" },
		E = { "<cmd>Neotree show<CR>", "NeoTree Show" },

		-- Window Management
		s = {
			name = "Split window",
			v = { ":vsplit<CR>", "Vertically" },
			h = { ":split<CR>", "Horizontally" },
			m = { ":MaximizerToggle<CR>", "Minimise" },
		},

		-- Lazy
		l = { "<cmd>Lazy<CR>", "[L]azy" },

		-- Harpoon
		h = {
			name = "Harpoon",
			m = { "<cmd>lua require('harpoon.mark').add_file()<CR>", "mark" },
			u = { "<cmd>lua require('harpoon.mark').rm_file()<CR>", "unmark" },
			l = { "<cmd>Telescope harpoon marks<CR>", "show marks" },
			n = { "<cmd>lua require('harpoon.ui').nav_next()<CR>", "next mark" },
			p = { "<cmd>lua require('harpoon.ui').nav_prev()<CR>", "previous mark" },
		},

		-- Clear search with <esc>
		["<esc>"] = { "<cmd>noh<cr><esc>", "Escape and clear hlsearch" },

		-- UI
		u = {
			name = "UI",
			d = { ":Noice dismiss<CR>", "Dismiss noice" },
		},
	}, { mode = "n", prefix = "<leader>" })
end

return {
	"folke/which-key.nvim",
	lazy = false,
	config = config,
}
