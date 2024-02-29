return {
	"numToStr/Comment.nvim",
	opts = {},
	keys = {
		{
			"<C-/>",
			"<Plug>(comment_toggle_linewise_current) j",
			desc = "Comment Line",
			mode = { "n" },
		},
		{
			"<C-kdivide>",
			"<Plug>(comment_toggle_linewise_current) j",
			desc = "Comment Line",
			mode = { "n" },
		},
		{
			"<C-/>",
			"<Plug>(comment_toggle_linewise_visual)",
			desc = "Comment Line",
			mode = { "v" },
		},
		{
			"<C-kdivide>",
			"<Plug>(comment_toggle_linewise_visual)",
			desc = "Comment Line",
			mode = { "v" },
		},
	},
}
