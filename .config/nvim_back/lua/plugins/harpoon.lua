return {
    "ThePrimeagen/harpoon",
    config = function()
        require("harpoon").setup()
        require("telescope").load_extension("harpoon")
    end,
    dependencies = {
        "nvim-lua/plenary.nvim",
    },
    keys = {
        { "<leader>hm", "<cmd>lua require(\"harpoon.mark\").add_file()<CR>", desc = "mark" },
        { "<leader>hu", "<cmd>lua require(\"harpoon.mark\").rm_file()<CR>",  desc = "unmark" },
        { "<leader>hl", "<cmd>Telescope harpoon marks<CR>",                  desc = "show marks" },
        { "<leader>hn", "<cmd>lua require(\"harpoon.ui\").nav_next()<CR>",   desc = "next mark" },
        { "<leader>hp", "<cmd>lua require(\"harpoon.ui\").nav_prev()<CR>",   desc = "previous mark" },
    }
}
