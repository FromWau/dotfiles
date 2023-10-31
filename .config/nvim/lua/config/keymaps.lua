local keymap = vim.api.nvim_set_keymap

local opts = { noremap = true, silent = true }

-- Buffer Navigation
keymap("n", "<leader>bn", "<cmd>bnext<CR>", opts) -- Next buffer
keymap("n", "<leader>bp", "<cmd>bprevious<CR>", opts) -- Prev buffer
keymap("n", "<leader>bb", "<cmd>e #<CR>", opts) -- Switch to Other Buffer
keymap("n", "<leader>`", "<cmd>e #<CR>", opts) -- Switch to Other Buffer

-- Directory Naviagtion
keymap("n", "<leader>E", ":Neotree show<CR>", opts)
keymap("n", "<leader>e", ":Neotree toggle<CR>", opts)

-- Pane and Window Navigation
keymap("n", "<C-h>", "<C-w>h", opts) -- Navigate Left
keymap("n", "<C-j>", "<C-w>j", opts) -- Navigate Down
keymap("n", "<C-k>", "<C-w>k", opts) -- Navigate Up
keymap("n", "<C-l>", "<C-w>l", opts) -- Navigate Right

-- Window Management
keymap("n", "<leader>sv", ":vsplit<CR>", opts) -- Split Vertically
keymap("n", "<leader>sh", ":split<CR>", opts) -- Split Horizontally
keymap("n", "<leader>sm", ":MaximizerToggle<CR>", opts) -- Toggle Minimise

-- Indenting
keymap("v", "<", "<gv", opts) -- Shift Indentation to Left
keymap("v", ">", ">gv", opts) -- Shift Indentation to Right

-- Comments
keymap("n", "<C-/>", "gcc j", { noremap = false })
keymap("v", "<C-/>", "gcc", { noremap = false })
keymap("n", "<C-kdivide>", "gcc j", { noremap = false })
keymap("v", "<C-kdivide>", "gcc", { noremap = false })

keymap("n", "<leader>l", "<cmd>Lazy<CR>", opts)
