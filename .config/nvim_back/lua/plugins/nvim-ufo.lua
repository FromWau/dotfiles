return {
	"kevinhwang91/nvim-ufo",
	dependencies = { "kevinhwang91/promise-async" },
	config = function()
		local handler = function(virtText, lnum, endLnum, width, truncate)
			local newVirtText = {}
			local suffix = (" 󰁃 %d "):format(endLnum - lnum)
			local sufWidth = vim.fn.strdisplaywidth(suffix)
			local targetWidth = width - sufWidth
			local curWidth = 0
			for _, chunk in ipairs(virtText) do
				local chunkText = chunk[1]
				local chunkWidth = vim.fn.strdisplaywidth(chunkText)
				if targetWidth > curWidth + chunkWidth then
					table.insert(newVirtText, chunk)
				else
					chunkText = truncate(chunkText, targetWidth - curWidth)
					local hlGroup = chunk[2]
					table.insert(newVirtText, { chunkText, hlGroup })
					chunkWidth = vim.fn.strdisplaywidth(chunkText)
					-- str width returned from truncate() may less than 2nd argument, need padding
					if curWidth + chunkWidth < targetWidth then
						suffix = suffix .. (" "):rep(targetWidth - curWidth - chunkWidth)
					end
					break
				end
				curWidth = curWidth + chunkWidth
			end
			table.insert(newVirtText, { suffix, "MoreMsg" })
			return newVirtText
		end

		vim.o.foldlevel = 99
		vim.o.foldlevelstart = -1
		vim.o.foldenable = true

		require("ufo").setup({
			enable_get_fold_virt_text = true,
			fold_virt_text_handler = handler,
			filetype_exclude = { "gitsigns", "help", "alpha", "dashboard", "neo-tree", "Trouble", "lazy", "mason" },
			open_fold_hl_timeout = 150,
			close_fold_kinds = { "imports", "comment" },

			preview = {
				win_config = {
					border = { "", "─", "", "", "", "─", "", "" },
					winhighlight = "Normal:Folded",
					winblend = 0,
				},
			},
		})
	end,
	keys = {
		{ "<C-Kplus>", "zo", desc = "Open fold" },
		{ "<C-Kminus>", "zc", desc = "Close fold" },
		{ "<A-Kplus>", require("ufo").openAllFolds, desc = "Open all folds" },
		{ "<A-Kminus>", require("ufo").closeAllFolds, desc = "Close all folds" },
		{ "zr", require("ufo").openFoldsExceptKinds, desc = "Open folds" },
		{ "zm", require("ufo").closeFoldsWith, desc = "Close folds" },
		{
			"zk",
			function()
				local winid = require("ufo").peekFoldedLinesUnderCursor()
				if not winid then
					vim.lsp.buf.hover()
				end
			end,
			desc = "Peek folded lines under cursor",
		},
	},
}
