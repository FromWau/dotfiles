#!/usr/bin/env bash

TMP_DIR="/tmp/open_windows/"

[[ -d $TMP_DIR ]] || mkdir -p $TMP_DIR

# Get the list of clients and iterate through each client
hyprctl clients -j | jq -c '.[] | {address, class, title, at, size}' | while IFS= read -r client; do
	# Extract necessary properties
	address=$(jq -r '.address' <<<"$client")
	at=($(jq -r '.at | @sh' <<<"$client"))
	size=($(jq -r '.size | @sh' <<<"$client"))

	# Extracting coordinates and dimensions
	startY=${at[0]}
	startX=${at[1]}
	width=${size[0]}
	height=${size[1]}

	# Generating the geometry string and defining the file path
	geometry="${startY},${startX} ${width}x${height}"
	picPath="$TMP_DIR$address.png"

	# Taking screenshot using grim
	grim -g "$geometry" "$picPath"

	# Building new client object without unnecessary properties
	newClient=$(jq -n \
		--arg picPath "$picPath" \
		--argjson client "$client" \
		'{$picPath, class: $client.class, title: $client.title}')

	echo "$newClient"
done | jq -s .
