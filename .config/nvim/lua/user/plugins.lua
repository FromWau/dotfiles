local fn = vim.fn

-- Automatically install packer
local install_path = fn.stdpath "data" .. "/site/pack/packer/start/packer.nvim"
if fn.empty(fn.glob(install_path)) > 0 then
    PACKER_BOOTSTRAP = fn.system {
        "git",
        "clone",
        "--depth",
        "1",
        "https://github.com/wbthomason/packer.nvim",
        install_path,
    }
    print "Installing packer close and reopen Neovim..."
    vim.cmd [[packadd packer.nvim]]
end

-- Autocommand that reloads neovim whenever you save the plugins.lua file
vim.cmd [[
    augroup packer_user_config
        autocmd!
        autocmd BufWritePost plugins.lua source <afile> | PackerSync
    augroup end
]]

-- Use a protected call so we don't error out on first use
local status_ok, packer = pcall(require, "packer")
if not status_ok then
    return
end

-- Have packer use a popup window
packer.init {
    display = {
        open_fn = function()
            return require("packer.util").float { border = "rounded" }
        end,
    },
}

-- Install your plugins here
return packer.startup(function(use)
    -- plugins
    use "wbthomason/packer.nvim" -- Have packer manage itself
    use "nvim-lua/popup.nvim" -- An implementation of the Popup API from vim in Neovim
    use "nvim-lua/plenary.nvim" -- Useful lua functions used ny lots of plugins
    use "numToStr/Comment.nvim" -- Comment stuff
    use "kyazdani42/nvim-web-devicons" -- Icons
    use "kyazdani42/nvim-tree.lua" -- NvimTree
    use "windwp/nvim-autopairs" -- Auto close {}, integrates with both cmp and treesitter
    use "akinsho/bufferline.nvim" -- Bufferline
    use "moll/vim-bbye"
    use "norcalli/nvim-colorizer.lua" -- Colorize the color codes to the color
    use "lewis6991/gitsigns.nvim" -- Git
    use "akinsho/toggleterm.nvim" -- Toggle Term
    use "folke/which-key.nvim" -- Whichkey
    use "ahmedkhalf/project.nvim" -- Project Management
    use "lewis6991/impatient.nvim" -- Load nvim faster
    use "lukas-reineke/indent-blankline.nvim" -- Indent Blankline

    -- Colorscheme plugins
    use "folke/tokyonight.nvim" -- nice colorscheme

    -- Alpha
    use 'goolord/alpha-nvim'
    use "antoinemadec/FixCursorHold.nvim" -- This is needed to fix lsp doc highlight

    -- cmp plugins
    use "hrsh7th/nvim-cmp" -- The completion plugin
    use "hrsh7th/cmp-buffer" -- buffer completions
    use "hrsh7th/cmp-path" -- path completions
    use "hrsh7th/cmp-cmdline" -- cmdline completions
    use "saadparwaiz1/cmp_luasnip" -- snippet completions
    use "hrsh7th/cmp-nvim-lsp" -- lsp completion
    use "hrsh7th/cmp-nvim-lua"

    -- snippets
    use "L3MON4D3/LuaSnip" -- Snippet engine
    use "rafamadriz/friendly-snippets" -- a bunch of snippets to use

    -- LSP (TODO port to mason)
    use "neovim/nvim-lspconfig" -- enable LSP
    use "williamboman/nvim-lsp-installer" -- simple to use language server installer
    use "jose-elias-alvarez/null-ls.nvim" -- for formatters and linters
    use "RRethy/vim-illuminate"

    -- Telescope
    use "nvim-telescope/telescope.nvim"
    use 'nvim-telescope/telescope-media-files.nvim'

    -- TreeSitter
    use {
        "nvim-treesitter/nvim-treesitter",
        run = ":TSUpdate",
    }

    -- rasi syntax for rofi
    use {
        'Fymyte/rasi.vim',
        ft = { 'rasi' },
        run = ':TSInstall rasi',
        requires = { 'nvim-treesitter/nvim-treesitter' },
    }

    -- TS Addons
    use "JoosepAlviste/nvim-ts-context-commentstring" -- Context aware commentting
    use "p00f/nvim-ts-rainbow" -- Rainbow parentheses

    -- DAP
    use "mfussenegger/nvim-dap"
    use "rcarriga/nvim-dap-ui"
    use "ravenxrz/DAPInstall.nvim"

    -- jdtls
    use "mfussenegger/nvim-jdtls"

    -- Latex
    use "jakewvincent/texmagic.nvim"

    -- Automatically set up your configuration after cloning packer.nvim
    -- Put this at the end after all plugins
    if PACKER_BOOTSTRAP then
        require("packer").sync()
    end
end)
