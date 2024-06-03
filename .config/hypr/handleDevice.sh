#!/usr/bin/env bash

test hyprctl || {
	echo "hyprctl is not installed"
	exit 1
}

case "$HOSTNAME" in
"arsus")
	echo "Applying settings for arsus"
	echo -en "Setting up monitor eDP-1 ..."
	hyprctl keyword monitor eDP-1,2880x1800@90,0x0,1.6

	echo -en "Setting keyboard layout de ..."
	hyprctl keyword input:kb_layout de
	;;
"archner")
	echo "Applying settings for archner"
	echo -en "Setting up monitor HDMI-A-1 ..."
	hyprctl keyword monitor HDMI-A-1,3840x2160@120,0x0,1

	echo -en "Setting keyboard layout us,de ..."
	hyprctl keyword input:kb_layout us,de
	;;
*)
	echo "No settings for $HOSTNAME"
	;;
esac
