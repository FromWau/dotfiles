#!/usr/bin/env bash

if hyprctl monitors -j | jq -e '.[].specialWorkspace | select(.name != "")' >/dev/null; then
    hyprctl dispatch togglespecialworkspace __TEMP >/dev/null
    hyprctl dispatch togglespecialworkspace __TEMP >/dev/null
fi
