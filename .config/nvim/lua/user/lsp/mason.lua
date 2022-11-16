local status_ok, mason = pcall(require, "mason")
if not status_ok then
	return
end

local status_ok_1, mason_installer = pcall(require, "mason-tool-installer")
if not status_ok_1 then
	return
end

local status_ok_2, mason_lspconfig = pcall(require, "mason-lspconfig")
if not status_ok_2 then
	return
end

local lsp_servers = {
	"sumneko_lua",
	"pyright",
	"html",
	"cssls",
	"tsserver",
	"jsonls",
	"yamlls",
	"jdtls",
    "kotlin_language_server"
}

local tool_servers = {
	"java-test",
	"java-debug-adapter",
}

local settings = {
	ui = {
		border = "rounded",
		icons = {
			package_installed = "◍",
			package_pending = "◍",
			package_uninstalled = "◍",
		},
	},
	log_level = vim.log.levels.INFO,
	max_concurrent_installers = 4,
}

mason.setup(settings)
mason_lspconfig.setup({
	ensure_installed = lsp_servers,
})
mason_installer.setup({
	ensure_installed = tool_servers,
	auto_update = true,
	run_on_start = true,
	start_delay = 1000,
})

local lspconfig_status_ok, lspconfig = pcall(require, "lspconfig")
if not lspconfig_status_ok then
	return
end

local opts = {}

for _, server in pairs(lsp_servers) do
	opts = {
		on_attach = require("user.lsp.handlers").on_attach,
		capabilities = require("user.lsp.handlers").capabilities,
	}

	server = vim.split(server, "@")[1]

	if server.name == "jsonls" then
		local jsonls_opts = require("user.lsp.settings.jsonls")
		opts = vim.tbl_deep_extend("force", jsonls_opts, opts)
	end

	if server == "yamlls" then
		local yamlls_opts = require("user.lsp.settings.yamlls")
		opts = vim.tbl_deep_extend("force", yamlls_opts, opts)
	end

	if server.name == "sumneko_lua" then
		local sumneko_opts = require("user.lsp.settings.sumneko_lua")
		opts = vim.tbl_deep_extend("force", sumneko_opts, opts)
	end

	if server.name == "pyright" then
		local pyright_opts = require("user.lsp.settings.pyright")
		opts = vim.tbl_deep_extend("force", pyright_opts, opts)
	end

	if server.name == "html-lsp" then
		local html_opts = require("user.lsp.settings.html")
		opts = vim.tbl_deep_extend("force", html_opts)
	end

	if server == "tsserver" then
		local tsserver_opts = require("user.lsp.settings.tsserver")
		opts = vim.tbl_deep_extend("force", tsserver_opts, opts)
	end

	if server == "jdtls" then
		goto continue
	end

	if server.name == "kotlin-language-server" then
		require("lspconfig").kotlin_language_server.setup({})
	end

	lspconfig[server].setup(opts)
	::continue::
end
