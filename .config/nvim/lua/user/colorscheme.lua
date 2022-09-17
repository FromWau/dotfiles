local colorscheme = "tokyonight"

if colorscheme == "tokyonight" then
    require(colorscheme).setup {
        transparent = true,                 -- Enable this to disable setting the background color
        terminal_colors = true,             -- Configure the colors used when opening a `:terminal` in Neovim
    }
end

local status_ok, _ = pcall(vim.cmd, "colorscheme " .. colorscheme)
    if not status_ok then
        vim.notify("colorscheme " .. colorscheme .. " not found!")
    return
end

