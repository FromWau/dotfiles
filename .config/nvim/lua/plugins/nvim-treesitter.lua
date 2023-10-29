local config = function()
	require("nvim-treesitter.configs").setup({
		indent = {
			enable = true,
		},
		autotag = {
			enable = true,
		},
		ensure_installed = {
			"bash",
			"comment",
			"diff",
			"dockerfile",
			"fish",
			"git_config",
			"git_rebase",
			"gitattributes",
			"gitcommit",
			"gitignore",
			"gpg",
			"html",
			"http",
			"ini",
			"java",
			"json",
			"kotlin",
			"latex",
			"lua",
			"markdown",
			"markdown_inline",
			"proto",
			"python",
			"rasi",
			"regex",
			"scss",
			"sql",
			"squirrel",
			"ssh_config",
			"xml",
			"yaml",
		},
		auto_install = true,
		highlight = {
			enable = true,
			additional_vim_regex_highlighting = false,
		},
	})
end

return {
	"nvim-treesitter/nvim-treesitter",
	lazy = false,
	config = config,
}
