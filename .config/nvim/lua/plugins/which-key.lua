return {
    "folke/which-key.nvim",
    event = "VeryLazy",
    config = function()
        require("which-key").setup()

        require("which-key").add {
            { "<leader>b", group = "[B]uffer" },
            { "<leader>c", group = "[C]ode" },
            { "<leader>f", group = "[F]ind", icon = " " },
            { "<leader>r", group = "[R]ename" },
            { "<leader>g", group = "[G]it", icon = " ", mode = { "n", "v" } },
            { "<leader>h", group = "[H]arpoon" },
            { "<leader>s", group = "[S]plit Window" },
            { "<leader>u", group = "[U]i" },
            { "<leader>x", group = "Trouble" },
            { "<leader>t", group = "[T]oogle" },
        }
    end,
}
