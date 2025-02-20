#!/usr/bin/env bash

scale_factor=1.5
hypr_dir="$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE"
info="# Auto generated"

# ensures that the scaling number is not odd
add_point_one_if_odd() {
    local num="$1"
    local decimal_part="${num#*.}"
    [[ "$decimal_part" == "$num" ]] && decimal_part="0"

    if ((decimal_part % 2 != 0)); then
        num=$(awk "BEGIN { printf \"%.1f\", $num + 0.1 }")
    fi

    echo "$num"
}

readarray -t monitors < <(hyprctl monitors -j | jq -r '.[] | "\(.name),\(.width)x\(.height)@\(.refreshRate),\(.x)x\(.y),\(.scale)"')
content=("$info")

for monitor in "${monitors[@]}"; do
    name=$(echo "$monitor" | cut -d ',' -f1)
    new_scale=$(echo "$monitor" | cut -d ',' -f4)

    default_scale=$(rg monitor= ~/.config/hypr/conf/io/monitor.conf | rg "$name" | cut -d',' -f4)

    dir="$hypr_dir/temp/monitors/$name"
    mkdir -p "$dir"

    if awk "BEGIN { exit !($new_scale > $default_scale) } "; then
        new_scale=$(add_point_one_if_odd "$default_scale")
        echo "false" >"$dir/is_scaled"
    else
        new_scale=$(awk "BEGIN { printf \"%.1f\", $scale_factor * $new_scale }")
        new_scale=$(add_point_one_if_odd "$new_scale")
        echo "true" >"$dir/is_scaled"
    fi

    monitor_config=$(echo "$monitor" | cut -d ',' -f-3)
    content+=("monitor=${monitor_config}, $new_scale")
done

content_str=$(printf "%s\n\n" "${content[@]}")

~/.config/hypr/scripts/utils/update_file.sh "temp/monitor_scale.conf" "$content_str" && swww restore
