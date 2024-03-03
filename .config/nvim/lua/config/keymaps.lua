local nmap = require("utils.keymaps").nmap
local vmap = require("utils.keymaps").vmap
local tmap = require("utils.keymaps").tmap

-- [[ Basic Keymaps ]]
-- TIP: Disable arrow keys in normal mode -- I am sry, I suck to much. Aaaah THATS WHAT SHE SAID.
-- keymap.set('n', '<left>', '<cmd>echo "Use h to move!!"<CR>')
-- keymap.set('n', '<right>', '<cmd>echo "Use l to move!!"<CR>')
-- keymap.set('n', '<up>', '<cmd>echo "Use k to move!!"<CR>')
-- keymap.set('n', '<down>', '<cmd>echo "Use j to move!!"<CR>')

-- Clear highlight on pressing <Esc> in normal mode
nmap("<ESC>", "<cmd>nohlsearch<CR>")

-- Diagnostic keymaps
nmap("dN", vim.diagnostic.goto_prev, { desc = "Go to previous [D]iagnostic message" })
nmap("dn", vim.diagnostic.goto_next, { desc = "Go to next [D]iagnostic message" })
nmap("de", vim.diagnostic.open_float, { desc = "Show diagnostic [E]rror messages" })
nmap("dq", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Exit terminal mode in the builtin terminal
tmap("<Esc><Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Keybinds to make split navigation easier.
--  Use CTRL+<hjkl> to switch between windows
--
--  See `:help wincmd` for a list of all window commands
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
