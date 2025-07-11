#!/usr/bin/env bash

test hyprctl || {
	echo "hyprctl is not installed"
	exit 1
}

function write() {
	~/.config/hypr/scripts/utils/update_file.sh "$1" "$2"
}

file=io/monitor.conf

info="# Auto generated
# Monitor Settings for $HOSTNAME"

case "$HOSTNAME" in
"arsus")
	content=$(
		cat <<EOF
$info
monitor=eDP-1, 2880x1800@90, 0x0, 1.5, bitdepth, 10, cm, hdr, sdrbrightness, 1.2, sdrsaturation, 0.98
EOF
	)

	write "$file" "$content"
	;;

"archner")
	content=$(
		cat <<EOF
$info
monitor=HDMI-A-1, 2560x1440@120, 0x0, 1, bitdepth, 10, cm, hdr, sdrbrightness, 1.1, sdrsaturation, 0.8
EOF
	)

	write "$file" "$content"
	;;

"archovo")
	hyprctl monitors -j | rg eDP-1 >/dev/null
	hasInternalMonitor=$?

	hyprctl monitors -j | rg DP-3 >/dev/null
	hasDP3=$?

	hyprctl monitors -j | rg DP-4 >/dev/null
	hasDP4=$?

	hyprctl monitors -j | rg DP-5 >/dev/null
	hasDP5=$?

	hyprctl monitors -j | rg HDMI-A-1 >/dev/null
	hasHDMIA1=$?

	if [ $hasInternalMonitor -eq 0 ] && [ $hasHDMIA1 -eq 0 ]; then
		content=$(
			cat <<EOF
$info - @home
monitor=eDP-1, 3840x2400@60, 0x1200, 2
monitor=HDMI-A-1, 4096x2160@120, 1920x0, 1
EOF
		)

		write "$file" "$content"
	fi

	if [ $hasInternalMonitor -eq 0 ] && [ $hasDP4 -eq 0 ] && [ $hasDP5 -eq 0 ]; then
		content=$(
			cat <<EOF
$info - @work
monitor=eDP-1, 3840x2400@60, 0x1200, 2
monitor=DP-4, 2560x1440, 1920x0, 1
monitor=DP-5, 2560x1440, 4480x0, 1
EOF
		)

		write "$file" "$content"
	fi

	if [ $hasInternalMonitor -eq 0 ] && [ $hasDP3 -eq 0 ] && [ $hasDP4 -eq 0 ]; then
		content=$(
			cat <<EOF
$info - @hallein
monitor=eDP-1, 3840x2400@60, 0x1200, 2
monitor=DP-4, 2560x1440, 1920x0, 1
monitor=DP-5, 2560x1440, 4480x0, 1
EOF
		)

		write "$file" "$content"
	fi
	;;

*)
	content=$(
		cat <<EOF >~/.config/hypr/conf/io/monitor.conf
$info - No Settings found, unsing default.
monitor=,preferred,auto,auto
EOF
	)

	write "$file" "$content"
	;;
esac
