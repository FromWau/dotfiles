local lang_conf = {
    lua = {
        lsps = { "lua_ls" },
        formatters = { "stylua" },
    },
}

local lsps = {}
local formatters = {}

for language, config in pairs(lang_conf) do
    if config.lsps then lsps[language] = config.lsps end
    if config.formatters then formatters[language] = config.formatters end
end

return {
    lsps = lsps,
    formatters = formatters,
}
