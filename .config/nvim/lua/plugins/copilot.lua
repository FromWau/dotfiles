return {
	"zbirenbaum/copilot.lua",
	cmd = "Copilot",
	build = ":Copilot auth",
	event = "InsertEnter",
	dependencies = "zbirenbaum/copilot-cmp",
	config = function()
		require("copilot").setup({
			suggestion = {
				enabled = true,
				auto_trigger = true,
			},
			panel = { enabled = false },
			filetypes = {
				["*"] = true,
				help = true,
			},
		})

		require("copilot_cmp").setup({
			formatters = {
				insert_text = require("copilot_cmp.format").remove_existing,
			},
		})
	end,
}
