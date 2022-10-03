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
    -- Core plugins   
    use "wbthomason/packer.nvim"                        -- Have packer manage itself
    use "nvim-lua/popup.nvim"                           -- An implementation of the Popup API from vim in Neovim
    use "nvim-lua/plenary.nvim"                         -- Useful lua functions used ny lots of plugins
    use "numToStr/Comment.nvim"                         -- Comment stuff

    -- Colorscheme plugins
    use "folke/tokyonight.nvim"                         -- nice colorscheme

    -- cmp plugins
    use "hrsh7th/nvim-cmp"                              -- The completion plugin
    use "hrsh7th/cmp-buffer"                            -- buffer completions
    use "hrsh7th/cmp-path"                              -- path completions
    use "hrsh7th/cmp-cmdline"                           -- cmdline completions
    use "saadparwaiz1/cmp_luasnip"                      -- snippet completions
    use "hrsh7th/cmp-nvim-lsp"                          -- lsp completion

    -- snippets
    use "L3MON4D3/LuaSnip"                              -- Snippet engine
    use "rafamadriz/friendly-snippets"                  -- a bunch of snippets to use

    -- LSP
    use "neovim/nvim-lspconfig"                         -- enable LSP
    use "williamboman/nvim-lsp-installer"               -- simple to use language server installer
    use "jose-elias-alvarez/null-ls.nvim"               -- for formatters and linters

    -- Telescope
    use "nvim-telescope/telescope.nvim"
    use 'nvim-telescope/telescope-media-files.nvim'

    -- TreeSitter
    use {
        "nvim-treesitter/nvim-treesitter",
        run = ":TSUpdate",
    }

    -- TS Addons
    use "JoosepAlviste/nvim-ts-context-commentstring"   -- Context aware commentting
    use "p00f/nvim-ts-rainbow"                          -- Rainbow parentheses

    -- Automatically close parentheses
    use "windwp/nvim-autopairs"                         -- Autopairs, integrates with both cmp and treesitter 

    -- Git 
    use "lewis6991/gitsigns.nvim"

    -- Icons
    use "kyazdani42/nvim-web-devicons"

    -- NvimTree
    use "kyazdani42/nvim-tree.lua"

    -- Bufferline
    use "akinsho/bufferline.nvim"
    use "moll/vim-bbye"

    -- Colorizer
    use 'norcalli/nvim-colorizer.lua'

    -- Automatically set up your configuration after cloning packer.nvim
    -- Put this at the end after all plugins
    if PACKER_BOOTSTRAP then
        require("packer").sync()
    end
end)
