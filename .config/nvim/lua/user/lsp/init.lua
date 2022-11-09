local status_ok, _ = pcall(require, "lspconfig")
if not status_ok then
	return
end

require("user.lsp.lsp-installer")
require("user.lsp.handlers").setup()
require("user.lsp.null-ls")
--[[ require('lspconfig').texlab.setup{ ]]
--[[     cmd = {"texlab"}, ]]
--[[     filetypes = {"tex", "bib"}, ]]
--[[     settings = { ]]
--[[         texlab = { ]]
--[[             rootDirectory = nil, ]]
--[[             build = { ]]
--[[                 onSave = true ]]
--[[             }, ]]
--[[             forwardSearch = { ]]
--[[                 executable = "firefox", ]]
--[[                 args = {"%p"} ]]
--[[             } ]]
--[[         } ]]
--[[     } ]]
--[[ } ]]
