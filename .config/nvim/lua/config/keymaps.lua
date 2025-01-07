local function map(mode, keys, func, opts)
	opts = opts or {}
	opts.noremap = true
	opts.silent = true
	vim.keymap.set(mode, keys, func, opts)
end

local function nmap(keys, func, opts) map("n", keys, func, opts) end
local function vmap(keys, func, opts) map("v", keys, func, opts) end
local function tmap(keys, func, opts) map("t", keys, func, opts) end

-- [[ Basic Keymaps ]]
-- TIP: Disable arrow keys in normal mode -- I am sry, I suck to much. Aaaah THATS WHAT SHE SAID.
-- keymap.set('n', '<left>', '<cmd>echo "Use h to move!!"<CR>')
-- keymap.set('n', '<right>', '<cmd>echo "Use l to move!!"<CR>')
-- keymap.set('n', '<up>', '<cmd>echo "Use k to move!!"<CR>')
-- keymap.set('n', '<down>', '<cmd>echo "Use j to move!!"<CR>')

-- Clear highlight on pressing <Esc> in normal mode
nmap("<ESC>", "<cmd>nohlsearch<CR>")

-- Diagnostic keymaps
nmap("dp", vim.diagnostic.goto_prev, { desc = "Go to previous [D]iagnostic message" })
nmap("dn", vim.diagnostic.goto_next, { desc = "Go to next [D]iagnostic message" })
nmap("de", vim.diagnostic.open_float, { desc = "Show diagnostic [E]rror messages" })
nmap("dq", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Exit terminal mode in the builtin terminal
tmap("<Esc><Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Pane and Window Navigation
nmap("<C-Left>", "<C-w>h", { desc = "Navigate Left" })
nmap("<C-Down>", "<C-w>j", { desc = "Navigate Down" })
nmap("<C-Up>", "<C-w>k", { desc = "Navigate Up" })
nmap("<C-Right>", "<C-w>l", { desc = "Navigate Right" })

-- Keep indenting
nmap("<", "<<", { desc = "Indent Left" })
nmap(">", ">>", { desc = "Indent Right" })
vmap("<", "<gv", { desc = "Indent Block Left" })
vmap(">", ">gv", { desc = "Indent Block Right" })

-- Select all
nmap("<C-a>", "ggVG", { desc = "Select all" })

-- Show Lazy
nmap("<leader>ul", function() require("lazy").show() end, { desc = "Show Lazy" })

-- Window management
nmap("<leader>sv", "<cmd>vsplit<CR>", { desc = "Split vertically" })
nmap("<leader>sh", "<cmd>split<CR>", { desc = "Split horizontally" })

-- quickfix
nmap("<C-n>", "<cmd>cnext<CR>", { desc = "Next quickfix" })
nmap("<C-p>", "<cmd>cprevious<CR>", { desc = "Previous quickfix" })
