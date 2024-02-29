return {
	"echasnovski/mini.nvim",
	config = function()
        require("mini.move").setup({
			mappings = {
                left = "<A-left>",
                right = "<A-right>",
				down = "<A-down>",
				up = "<A-up>",

				line_left = "<A-left>",
				line_right = "<A-right>",
				line_down = "<A-down>",
				line_up = "<A-up>",
			},
		})
	end,
}
