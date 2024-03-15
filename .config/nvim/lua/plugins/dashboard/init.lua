local banners = require "plugins.dashboard.banners"

local function rand_banner()
    local keys = {}
    for key, _ in pairs(banners) do
        table.insert(keys, key)
    end

    local randomKey = keys[math.random(#keys)]
    return banners[randomKey]
end

-- local header = {
-- banner = rand_banner(),
-- title = "  Welcome to Neovim",
-- details = {
--     { icon = " ", desc = vim.fn.fnamemodify(vim.fn.getcwd(), ":t") },
--     { icon = " ", desc = vim.fn.system "git branch --show-current" },
--     { icon = " ", desc = vim.fn.strftime "%a %b %d %I:%M %p" },
-- },
-- }

-- local function headerToTable()
-- local m = {}
-- table.insert(m, header.banner)
-- table.insert(m, { header.title })
-- for _, detail in ipairs(header.details) do
-- table.insert(m, {
-- detail.icon .. detail.desc .. string.rep(" ", 43 - #detail.desc),
-- })
-- end
-- return m
-- end

local opts = {
    theme = "doom",
    config = {
        header = rand_banner(),
        center = {
            { icon = " ", desc = "Find File", action = "Telescope find_files", key = "f" },
            { icon = " ", desc = "New File", action = "ene | startinsert", key = "n" },
            { icon = "󱄽 ", desc = "Find Word", action = "Telescope live_grep", key = "g" },
            { icon = " ", desc = "Recently Used Files", action = "Telescope oldfiles", key = "r" },
            { icon = "󰙅 ", desc = "File Browser", action = "Neotree toggle", key = "e" },
            { icon = "󰊳 ", desc = "Open Lazy", action = "Lazy", key = "l" },
            { icon = "󰺾 ", desc = "Open Mason", action = "Mason", key = "m" },
            { icon = "󰩈 ", desc = "Quit", action = "qa", key = "q" },
        },
        footer = {},
    },
}

for _, action in ipairs(opts.config.center) do
    action.desc = action.desc .. string.rep(" ", 43 - #action.desc)
    action.icon_hl = "Title"
    action.desc_hl = "String"
    action.key_hl = "Number"
end

-- close Lazy and re-open when the dashboard is ready
if vim.o.filetype == "lazy" then
    vim.cmd.close()
    vim.api.nvim_create_autocmd("User", {
        pattern = "DashboardLoaded",
        callback = function() require("lazy").show() end,
    })
end

return {
    "nvimdev/dashboard-nvim",
    event = "VimEnter",
    opts = opts,
    dependencies = "nvim-tree/nvim-web-devicons",
}
