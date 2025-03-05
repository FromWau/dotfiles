return {
    "folke/which-key.nvim",
    event = "VeryLazy",
    config = function()
        require("which-key").setup()

        require("which-key").add {
            { "<leader>b", group = "[B]uffer", icon = " " },
            { "<leader>c", group = "[C]ode", icon = " " },
            { "<leader>f", group = "[F]ind", icon = " " },
            { "<leader>r", group = "[R]ename" },
            { "<leader>g", group = "[G]it", icon = " ", mode = { "n", "v" } },
            { "<leader>h", group = "[H]arpoon" },
            { "<leader>s", group = "[S]plit Window", icon = "󰤼 " },
            { "<leader>u", group = "[U]i", icon = " " },
            { "<leader>x", group = "Trouble", icon = " " },
            { "<leader>t", group = "[T]oogle" },
            { "<leader>R", group = "[R]est", icon = "󱂛 " },
            { "<leader>d", group = "[D]BUI", icon = "󱘲 " },
        }
    end,
}
