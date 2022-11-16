local dap_status_ok, illuminate = pcall(require, "illuminate")
if not dap_status_ok then
	return
end

illuminate.configure({
    filetypes_denylist = {
        'alpha',
        'NvimTree'
    },
})

vim.api.nvim_set_keymap('n', '<a-n>', '<cmd>lua require"illuminate".next_reference{wrap=true}<cr>', {noremap=true})
vim.api.nvim_set_keymap('n', '<a-p>', '<cmd>lua require"illuminate".next_reference{reverse=true,wrap=true}<cr>', {noremap=true})

