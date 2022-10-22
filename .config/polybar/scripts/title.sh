#!/bin/sh


WM_DESKTOP=$(xprop -root _NET_ACTIVE_WINDOW | cut -d\# -f 2 | xargs)

if [ "$WM_DESKTOP" = "0x0" ]; then
    echo " Desktop :3"
    exit 0
fi

if [ -n "$1" ]; then
    if [ "$1" = "--kill" ]; then
        wmctrl -ic "$WM_DESKTOP"
    fi
fi


WM_PID=$(xprop -id "$WM_DESKTOP" _NET_WM_PID | cut -d '=' -f 2 | xargs)
WM_CLASS=$(xprop -id "$WM_DESKTOP" WM_CLASS | awk 'NF {print $NF}' | sed 's/"/ /g')
WM_NAME=$(xprop -id "$WM_DESKTOP" WM_NAME | cut -d '=' -f 2 | awk -F\" '{ print $2 }')

printf "%s (PID: %s)  %.50s" "$WM_CLASS" "$WM_PID" "$WM_NAME"

