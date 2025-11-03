#!/usr/bin/env bash

# Mouse Mode Toggle Script
# Designed for comfortable bed-time usage with mouse only
# - Scales monitor to effectively 1080p (larger UI elements)
# - Increases cursor size for better visibility
# - Toggles AGS mouse mode (shows app launcher, hides technical widgets)

cursor_size_normal=24
cursor_size_large=48
hypr_dir="$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE"
target_height=1080  # Target resolution height for mouse mode

# Round to nearest 0.25 (Hyprland requirement)
round_to_quarter() {
    local num="$1"
    # Round to nearest 0.25: (round(num * 4)) / 4
    awk "BEGIN { printf \"%.2f\", (int($num * 4 + 0.5)) / 4 }"
}

# Create temp directory if it doesn't exist
mkdir -p "$hypr_dir/temp"

# Get current state from AGS
current_state=$(ags request mousemode)

# Toggle state
if [[ "$current_state" == "true" ]]; then
    # Disable mouse mode - restore normal scale
    mouse_mode_enabled="false"
    echo "Disabling mouse mode..."
else
    # Enable mouse mode
    mouse_mode_enabled="true"
    echo "Enabling mouse mode..."
fi

# Update AGS state
ags request mousemode "$mouse_mode_enabled" >/dev/null

# Get monitor info
readarray -t monitors < <(hyprctl monitors -j | jq -r '.[] | "\(.name),\(.width)x\(.height)@\(.refreshRate),\(.x)x\(.y)"')

# Build monitor config
content=("# Auto generated - Mouse Mode")

for monitor in "${monitors[@]}"; do
    name=$(echo "$monitor" | cut -d ',' -f1)
    resolution=$(echo "$monitor" | cut -d ',' -f2)
    position=$(echo "$monitor" | cut -d ',' -f3)

    # Get default scale from config
    default_scale=$(rg "monitor=$name" ~/.config/hypr/conf/io/monitor.conf | cut -d',' -f4 || echo "1")
    [[ -z "$default_scale" ]] && default_scale="1"

    if [[ "$mouse_mode_enabled" == "true" ]]; then
        # Calculate scale to get to target height (1080p)
        # Extract height from resolution (e.g., "2560x1440@120" -> 1440)
        height=$(echo "$resolution" | sed 's/.*x\([0-9]*\).*/\1/')

        # Calculate scale: current_height / target_height
        calculated_scale=$(awk "BEGIN { printf \"%.2f\", $height / $target_height }")

        # Round to nearest 0.25 for Hyprland compatibility
        new_scale=$(round_to_quarter "$calculated_scale")

        cursor_size="$cursor_size_large"

        echo "Mouse mode: scaling $name from ${height}p to ${target_height}p (scale: $new_scale)"
    else
        new_scale="$default_scale"
        cursor_size="$cursor_size_normal"
    fi

    # Get additional monitor settings from config
    extra_settings=$(rg "monitor=$name" ~/.config/hypr/conf/io/monitor.conf | cut -d',' -f5- || echo "")

    if [[ -n "$extra_settings" ]]; then
        content+=("monitor=${name}, ${resolution}, ${position}, ${new_scale}, ${extra_settings}")
    else
        content+=("monitor=${name}, ${resolution}, ${position}, ${new_scale}")
    fi
done

# Write monitor config
content_str=$(printf "%s\n" "${content[@]}")
~/.config/hypr/scripts/utils/update_file.sh "temp/monitor_scale.conf" "$content_str"

# Update cursor size
hyprctl setcursor Bibata-Modern-Ice "$cursor_size"

# Send notification (AGS will auto-detect state change via polling)
if [[ "$mouse_mode_enabled" == "true" ]]; then
    notify-send "Mouse Mode" "Enabled - Comfortable bed browsing mode" -i input-mouse
else
    notify-send "Mouse Mode" "Disabled - Normal desktop mode" -i input-mouse
fi

# Restore wallpaper to fix any rendering issues
swww restore 2>/dev/null || true

echo "Mouse mode: $mouse_mode_enabled"
