#!/usr/bin/env bash

apps=$(
    fd -e desktop --base-directory ~/.local/share/applications --absolute-path
)
apps+=$(
    fd -e desktop --base-directory /usr/share/applications --absolute-path
)

apps=$(echo "$apps" | sort | uniq)

while IFS= read -r app; do
    echo "$app"
done <<<"$apps"
