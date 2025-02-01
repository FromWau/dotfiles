#!/usr/bin/env bash

function write() {
	file=~/.config/hypr/conf/$1
	content=$2
	content_file=$(cat "$file" 2>/dev/null)

	if [ "$content_file" == "$content" ]; then
		echo "$file content is already set"
		exit 1
	fi

	notify-send "Updating Hyprland Settings" "Change in $1"

	[[ ! -f "$file" ]] && mkdir -p "$(dirname "$file")"
	echo "$content" >"$file"
}

if [[ -z $1 || -z $2 ]]; then
	echo "Usage: $0 <file> <content>"
	exit 1
fi

if [[ $2 == "clear" ]]; then
	write "$1" "# Auto generated"
else
	write "$1" "$2"
fi
