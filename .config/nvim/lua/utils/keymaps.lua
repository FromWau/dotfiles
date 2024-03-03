local function map(mode, keys, func, opts)
    local options = { noremap = true, silent = true }
    if opts then options = vim.tbl_extend("force", options, opts) end
    vim.keymap.set(mode, keys, func, options)
end

local function nmap(keys, func, opts) map("n", keys, func, opts) end
local function vmap(keys, func, opts) map("v", keys, func, opts) end
local function tmap(keys, func, opts) map("t", keys, func, opts) end

local m = {
    map = map,
    nmap = nmap,
    vmap = vmap,
    tmap = tmap,
}

return m
