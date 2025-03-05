vim.g.mapleader = " "
vim.g.maplocalleader = "\\"
vim.g.have_nerd_font = true

local opt = vim.opt
opt.number = true

opt.wrap = false

opt.clipboard = "unnamedplus"
opt.signcolumn = "yes"

opt.scrolloff = 15
opt.sidescrolloff = 15

opt.termguicolors = true
opt.cursorline = true

opt.undofile = true
opt.swapfile = false
opt.backup = false

opt.inccommand = "split"

opt.hlsearch = true
opt.ignorecase = true
opt.smartcase = true

opt.spell = false
opt.spelllang = { "en", "de" }

opt.tabstop = 4
opt.shiftwidth = 4
opt.softtabstop = 4
opt.expandtab = true
opt.smartindent = true
opt.wrap = false
opt.linebreak = false
