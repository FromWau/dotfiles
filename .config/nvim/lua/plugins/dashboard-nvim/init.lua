local banners = require("plugins.dashboard-nvim.banners")

local function rand_banner()
    local keys = {}
    for key, _ in pairs(banners) do
        table.insert(keys, key)
    end

    local randomKey = keys[math.random(#keys)]
    return banners[randomKey]
end


return {
    'nvimdev/dashboard-nvim',
    event = 'VimEnter',
    config = function()
        require('dashboard').setup {
            config = {
                header = rand_banner(),
                shortcut = {
                    {
                        icon = '󰊳 ',
                        icon_hl = 'Title',
                        desc = 'Update',
                        desc_hl = 'String',
                        group = 'Label',
                        key = 'u',
                        action = 'Lazy update',
                    },
                    {
                        icon = ' ',
                        icon_hl = 'Title',
                        desc = 'Sync',
                        desc_hl = 'String',
                        group = 'Label',
                        key = 's',
                        action = 'Lazy sync',
                    },
                    {
                        icon = ' ',
                        icon_hl = 'Title',
                        desc = 'Find Files',
                        desc_hl = 'String',
                        group = 'Label',
                        key = 'f',
                        action = 'Telescope find_files',
                    },
                    {
                        icon = ' ',
                        icon_hl = 'Title',
                        desc = 'Find Word',
                        desc_hl = 'String',
                        group = 'Label',
                        key = 'g',
                        action = 'Telescope live_grep',
                    },
                    {
                        icon = '󰙅 ',
                        icon_hl = 'Title',
                        desc = 'File Browser',
                        desc_hl = 'String',
                        group = 'Label',
                        key = 'e',
                        action = 'NvimTreeToggle',
                    },
                    {
                        icon = '󰩈 ',
                        icon_hl = 'Title',
                        desc = 'Quit',
                        desc_hl = 'String',
                        group = 'Label',
                        key = 'q',
                        action = 'q',
                    },
                },
                packages = { enable = true },
            },
        }
    end,
    dependencies = {
        {'nvim-tree/nvim-web-devicons'}
    }
}
