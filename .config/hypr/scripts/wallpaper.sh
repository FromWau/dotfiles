#!/bin/sh
wallpaper=$(find ~/Pictures/wallpapers/ -wholename "*.png" -o -wholename "*.jpg" | shuf --random-source=/dev/urandom -n 1)
echo $wallpaper
printf "preload = $wallpaper \n wallpaper = ,$wallpaper" >~/.config/hypr/hyprpaper.conf
hyprpaper
