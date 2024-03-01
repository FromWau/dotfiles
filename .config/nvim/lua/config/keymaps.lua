-- [[ Basic Keymaps ]]
local keymap = vim.keymap

-- TIP: Disable arrow keys in normal mode -- I am sry, I suck to much. Aaaah THATS WHAT SHE SAID.
-- keymap.set('n', '<left>', '<cmd>echo "Use h to move!!"<CR>')
-- keymap.set('n', '<right>', '<cmd>echo "Use l to move!!"<CR>')
-- keymap.set('n', '<up>', '<cmd>echo "Use k to move!!"<CR>')
-- keymap.set('n', '<down>', '<cmd>echo "Use j to move!!"<CR>')

-- Clear highlight on pressing <Esc> in normal mode
keymap.set("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Diagnostic keymaps
keymap.set("n", "dN", vim.diagnostic.goto_prev, { desc = "Go to previous [D]iagnostic message" })
keymap.set("n", "dn", vim.diagnostic.goto_next, { desc = "Go to next [D]iagnostic message" })
keymap.set("n", "de", vim.diagnostic.open_float, { desc = "Show diagnostic [E]rror messages" })
keymap.set("n", "dq", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Exit terminal mode in the builtin terminal
keymap.set("t", "<Esc><Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Keybinds to make split navigation easier.
--  Use CTRL+<hjkl> to switch between windows
--
--  See `:help wincmd` for a list of all window commands
-- Pane and Window Navigation
keymap.set("n", "<C-Left>", "<C-w>h", { desc = "Navigate Left" })
keymap.set("n", "<C-Down>", "<C-w>j", { desc = "Navigate Down" })
keymap.set("n", "<C-Up>", "<C-w>k", { desc = "Navigate Up" })
keymap.set("n", "<C-Right>", "<C-w>l", { desc = "Navigate Right" })

-- Keep indent
keymap.set("n", "<", "<gv", { desc = "Indent Left" })
keymap.set("n", ">", ">gv", { desc = "Indent Right" })

-- Select all
keymap.set("n", "<C-a>", "ggVG", { desc = "Select all" })
