local tools = require("plugins.lang.config")

local function getTables()
    local ensure_installed = {}
    local formatters = {}
    local linters = {}
    local language_servers = {}

    local toolSet = {}
    local function insertEnsure(tbl)
        for _, tool_table in ipairs(tbl) do
            if type(tool_table) == "string" then
                if not toolSet[tool_table] then toolSet[tool_table] = true end
            elseif next(tool_table) ~= nil then
                for _, tool in ipairs(tool_table) do
                    if not toolSet[tool] then toolSet[tool] = true end
                end
            end
        end
    end

    for lang, langTools in pairs(tools) do
        if langTools.formatter then
            formatters[lang] = langTools.formatter
            insertEnsure(langTools.formatter)
        end
        if langTools.linter then
            linters[lang] = langTools.linter
            insertEnsure(langTools.linter)
        end
        if langTools.lsp then
            for server, config in pairs(langTools.lsp) do
                language_servers[server] = config
                if not toolSet[server] then toolSet[server] = true end
            end
        end
    end

    for k, _ in pairs(toolSet) do
        table.insert(ensure_installed, k)
    end

    local m = {
        ensure_installed = ensure_installed,
        formatters = formatters,
        linters = linters,
        language_servers = language_servers,
    }
    return m
end

local m = { getTables = getTables }
return m
