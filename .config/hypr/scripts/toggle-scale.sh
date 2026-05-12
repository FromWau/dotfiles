#!/usr/bin/env bash

scale_factor=2
hypr_dir="$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE"

echo "[toggle-scale] Starting toggle-scale script"

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

for monitor in "${monitors[@]}"; do
    name=$(echo "$monitor" | cut -d ',' -f1)
    current_scale=$(echo "$monitor" | cut -d ',' -f4)

    # Read default scale from monitors.lua. Matches `hl.monitor { ... name = "X" ... scale = N ... }`
    # across single- or multi-line table forms. Falls back to 1.0 if no entry exists yet
    # (monitors.lua is an empty placeholder until nwg-displays lands lua output support).
    default_scale=$(rg -UP -o -r '$1' "(?s)hl\.monitor\s*\{[^}]*name\s*=\s*[\"']$name[\"'][^}]*scale\s*=\s*([0-9.]+)" ~/.config/hypr/monitors.lua 2>/dev/null | head -1)
    [[ -z "$default_scale" ]] && default_scale="1.0"

    echo "[toggle-scale] Monitor: $name, Current: $current_scale, Default: $default_scale"

    dir="$hypr_dir/temp/monitors/$name"
    mkdir -p "$dir"

    # Check if we're in scaled mode by reading the state file
    is_scaled="false"
    if [[ -f "$dir/is_scaled" ]]; then
        is_scaled=$(cat "$dir/is_scaled")
    fi

    echo "[toggle-scale] Scaled state: $is_scaled"

    # Toggle based on state
    if [[ "$is_scaled" == "true" ]]; then
        # Scale down to default
        new_scale="$default_scale"
        echo "false" >"$dir/is_scaled"
        echo "[toggle-scale] Scaling DOWN to $new_scale"
    else
        # Scale up
        new_scale=$(awk "BEGIN { printf \"%.1f\", $scale_factor }")
        new_scale=$(add_point_one_if_odd "$new_scale")
        echo "true" >"$dir/is_scaled"
        echo "[toggle-scale] Scaling UP to $new_scale"
    fi

    monitor_config=$(echo "$monitor" | cut -d ',' -f-3)

    # Apply directly to Hyprland
    echo "[toggle-scale] Applying: monitor=${monitor_config}, $new_scale"
    hyprctl keyword monitor "${monitor_config}, $new_scale"
done

# Restore wallpaper
awww restore

echo "[toggle-scale] Done"
