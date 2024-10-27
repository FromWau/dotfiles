#!/usr/bin/env bash

fd --base-directory ~/.config/hypr/conf/temp/ \
    --strip-cwd-prefix \
    -e conf \
    -x ~/.config/hypr/scripts/utils/update_file.sh "temp/{}" "clear"

rm -r "$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/temp/"

swww restore
