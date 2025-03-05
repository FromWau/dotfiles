vim.api.nvim_create_autocmd("TextYankPost", {
    desc = "Highlight when yanking (copying) text",
    group = vim.api.nvim_create_augroup("kickstart-highlight-yank", { clear = true }),
    callback = function() vim.highlight.on_yank() end,
})

vim.api.nvim_create_autocmd("FileType", {
    pattern = "sql",
    callback = function()
        vim.set.keymap(
            "n",
            "<leader>sc",
            "ggO.mode csv<CR>.header on<CR>.separator ;<CR><ESC>:w<CR>ggd4d",
            { noremap = true, silent = true, buffer = 0, desc = "Query as CSV" }
        )
    end,
})

vim.api.nvim_create_autocmd("FileType", {
    pattern = "dbui",
    callback = function()
        vim.keymap.set("n", "<leader>de", function()
            local dad_buf = vim.api.nvim_get_current_buf()

            local create_floating_window = require("lib.window").Create_floating_window
            if not create_floating_window then
                vim.api.nvim_err_write "Failed to load create_floating_window\n"
                return
            end

            create_floating_window(
                "Database connections",
                nil,
                function(buf) vim.cmd("edit ~/.local/share/db_ui/connections.json", { buffer = buf }) end,
                function()
                    vim.api.nvim_out_write "callback"
                    vim.cmd("DBUI", { buffer = dad_buf })
                    vim.cmd("only", { buffer = dad_buf })
                    vim.cmd("normal R", { buffer = dad_buf })
                    vim.api.nvim_out_write "callback end"
                end
            )
        end)
    end,
})

-- Enable spell checking for markdown and text files
vim.api.nvim_create_autocmd("FileType", {
    pattern = { "markdown", "text" },
    command = "setlocal spell"
})


-- Set .http files to use the http filetype
vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
    pattern = "*.http",
    command = "setfiletype http"
})

