#!/bin/sh

OUTPUT="HDMI-0"
RES="4096x2160"

x=$(( $(echo $RES | cut -d "x" -f 1) /2 ))
y=$(( $(echo $RES | cut -d "x" -f 2) /2 ))

SCALED_RES="${x}x${y}"
CURRENT=$(xrandr | grep -oP "current \d* x \d*" | cut -d " " -f 2-4 | tr -d "[:blank:]")


if [ ! -z "$1" ]; then
    if [ "$1" = "--switch" ]; then
        if [ "$CURRENT" = "$RES" ]; then
            xrandr --output HDMI-0 --mode 4096x2160 --scale 0.5x0.5 && echo "awesome.restart()" | awesome-client
        else
            xrandr --output HDMI-0 --mode 4096x2160 --scale 1x1 && echo "awesome.restart()" | awesome-client
        fi 
    fi
fi


if [ "$CURRENT" = "$RES" ]; then
    echo "switch to bed"
else
    echo "switch to desk"
fi



