#!/usr/bin/env bash

if hyprctl monitors -j | jq -e '.[].specialWorkspace | select(.name != "")' >/dev/null; then
    hyprctl dispatch 'hl.dsp.workspace.toggle_special("__TEMP")' >/dev/null
    hyprctl dispatch 'hl.dsp.workspace.toggle_special("__TEMP")' >/dev/null
fi
