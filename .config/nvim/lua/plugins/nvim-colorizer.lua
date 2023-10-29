local config = function()
	require("colorizer").setup({
		filetypes = { "*" },
		user_default_options = {
			RGB = true,
			RRGGBB = true,
			names = true,
			RRGGBBAA = true,
			AARRGGBB = true,
			rgb_fn = true,
			hsl_fn = true,
			css = true, -- Enable all CSS features: rgb_fn, hsl_fn, names, RGB, RRGGBB
			css_fn = true, -- Enable all CSS *functions*: rgb_fn, hsl_fn
			mode = "background",
			tailwind = true,
			sass = {
				enable = true,
				parsers = { "css" },
			},
			virtualtext = "■",
			always_update = false,
		},
		buftypes = {},
	})
end

return {
	"NvChad/nvim-colorizer.lua",
	lazy = false,
	config = config,
}
