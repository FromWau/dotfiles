#!/usr/bin/env bash

sed -i '/^\[palettes\.colors\]/,/^\[/{
    /^\[palettes\.colors\]/!{ 
        /^\[/!d 
    }
}' ~/.config/starship.toml

sed -i '/^\[palettes\.colors\]/r /home/fromml/.cache/matugen/starship.toml' ~/.config/starship.toml

sed -i 's/^palette = .*/palette = "colors"/' ~/.config/starship.toml
