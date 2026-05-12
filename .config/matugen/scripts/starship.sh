#!/usr/bin/env bash

sed -i --follow-symlinks '/^\[palettes\.colors\]/,/^\[/{
    /^\[palettes\.colors\]/!{ 
        /^\[/!d 
    }
}' ~/.config/starship.toml

sed -i --follow-symlinks '/^\[palettes\.colors\]/r /home/fromml/.cache/matugen/starship.toml' ~/.config/starship.toml

sed -i --follow-symlinks 's/^palette = .*/palette = "colors"/' ~/.config/starship.toml
