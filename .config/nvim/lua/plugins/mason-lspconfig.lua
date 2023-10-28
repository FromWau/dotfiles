local opts = {
	ensure_installed = {
		"efm",
		"bashls",
		"tailwindcss",
		"pyright",
		"html",
		"cssls",
		"lua_ls",
		"jsonls",
	},

	automatic_installation = true,
}

return {
	"williamboman/mason-lspconfig.nvim",
	opts = opts,
	event = "BufReadPre",
	dependencies = "williamboman/mason.nvim",
}
