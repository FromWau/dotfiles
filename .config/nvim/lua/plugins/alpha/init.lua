-- Docs https://www.lazyvim.org/plugins/ui#alpha-nvim

local banners = require("plugins.alpha.banners")

local function rand_banner()
    local keys = {}
    for key, _ in pairs(banners) do
        table.insert(keys, key)
    end

    local randomKey = keys[math.random(#keys)]
    return banners[randomKey]
end

return {
    "goolord/alpha-nvim",
    opts = function(_, opts)
        opts.section.header.val = rand_banner()
    end,
}
