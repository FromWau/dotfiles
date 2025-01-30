local M = {}

function M.Create_floating_window(name, win_opts, setup, callback)
    if name == nil then name = "New floating window" end

    if win_opts == nil then
        win_opts = {
            relative = "editor",
            width = math.floor(vim.o.columns * 0.8),
            height = math.floor(vim.o.lines * 0.8),
            col = math.floor((vim.o.columns * 0.2) / 2),
            row = math.floor((vim.o.lines * 0.2) / 2),
            style = "minimal",
        }
    end

    local buf = vim.api.nvim_create_buf(false, true)
    if not vim.api.nvim_buf_is_valid(buf) then
        vim.api.nvim_out_write "Failed to create buffer\n"
        return
    end

    local win_id = vim.api.nvim_open_win(buf, true, win_opts)
    vim.api.nvim_buf_set_name(buf, name)

    if setup then setup(buf) end

    vim.api.nvim_create_autocmd("WinClosed", {
        pattern = tostring(win_id),
        callback = function()
            if callback then callback() end
        end,
    })
end

return M
