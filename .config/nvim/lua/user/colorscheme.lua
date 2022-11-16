local colorscheme = "tokyonight-night"

local status_ok, scheme = pcall(vim.cmd, "colorscheme " .. colorscheme)
    if not status_ok then
        vim.notify("colorscheme " .. colorscheme .. " not found!")
    return
end

