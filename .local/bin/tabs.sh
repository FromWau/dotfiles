#!/usr/bin/env bash

clients=$(hyprctl clients -j | jq -r '.[] | select(.mapped==true) | {class: .class ,title: .title, address: .address}')

window=$(echo "$clients" | jq -r '[ .class, .title|tostring ] | join(": ")' | fzf)

echo $window
window_class=$(echo "$window" | cut -d':' -f1)
window_title=$(echo "$window" | cut -d':' -f2-)

echo $window_class
echo $window_title

window_addr=$(echo "$clients" | jq -r --arg window_class "$window_class" --arg window_title "$window_title" 'select(.class == $window_class and .title == $window_title) | .address')
echo $window_addr

# window_addr=$(echo "$clients" | jq -r " select(.class==\"$window_class\" and .title==\"$window_title\") | .address") 
# echo $window_addr

# hyprctl dispatch focuswindow address:"$window_addr"
