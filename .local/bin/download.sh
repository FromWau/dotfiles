#!/usr/bin/env bash

save_dir="$HOME/music-triage"

url=$1

echo "Fetching data..."
data=$(curl --progress-bar \
    --location 'https://spotymate.com/api/get-metadata' \
    --header 'Content-Type: application/json' \
    --data "{\"url\":\"$url\"}")

error=$(echo "$data" | jq -r '.apiResponse.error')

if [ "$error" != "null" ]; then
    echo "Error: $error"
    exit 1
fi

# echo "$data" | jq -r '.apiResponse.data'

mapfile -t names < <(echo "$data" | jq -r '.apiResponse.data[].name')
mapfile -t albums < <(echo "$data" | jq -r '.apiResponse.data[].album')
mapfile -t album_names < <(echo "$data" | jq -r '.apiResponse.data[].album_name')
mapfile -t artists < <(echo "$data" | jq -r '.apiResponse.data[].artist')
mapfile -t track_urls < <(echo "$data" | jq -r '.apiResponse.data[].url')

current_album=${album_names[0]}

for i in "${!names[@]}"; do

    name="${names[$i]}"
    if [ "$name" == "null" ]; then
        echo "Error: Name is null"
        exit 1
    fi

    album="${albums[$i]}"
    if [ "$album" == "null" ]; then
        album=${album_names[$i]}
        if [ "$album" == "null" ]; then
            album="$current_album"
        else
            current_album="$album"
        fi
    else
        current_album="$album"
    fi

    artist="${artists[$i]}"
    if [ "$artist" == "null" ]; then
        echo "Error: Artist is null"
        exit 1
    fi

    track_url="${track_urls[$i]}"
    if [ "$track_url" == "null" ]; then
        echo "Error: URL is null"
        exit 1
    fi

    echo "Downloading: $name by $artist"
    # echo "Artist: $artist"
    # echo "Album: $album"
    # echo "Name: $name"
    # echo "-----------------"

    result=$(curl --silent \
        --location 'https://spotymate.com/api/download-track' \
        --header 'Content-Type: application/json' \
        --data "{\"url\":\"$track_url\"}")

    error=$(echo "$result" | jq -r '.msg')
    if [ "$error" != "null" ]; then
        echo "Skipping, Reason: $error"
    fi

    mkdir -p "$save_dir/$artist/$album/"

    file_url=$(echo "$result" | jq -r .file_url)
    curl --progress-bar \
        --location "$file_url" \
        --output "$save_dir/$artist/$album/$name.mp3"
done

echo "Done"
echo "Files saved to: $save_dir"
eza --icons --all --group-directories-first --color always --tree --ignore-glob ".git*" "$save_dir"

read -r -p "Import now with beets [Y/n]: " response
response=${response:-Y}

case "$response" in
[Yy] | [Yy][Ee][Ss])
    beet import "$save_dir"
    ;;
[Nn] | [Nn][Oo])
    echo "Ready to import via ´beet import $save_dir´"
    ;;
*)
    echo "Invalid response. Please enter Y or N."
    ;;
esac
