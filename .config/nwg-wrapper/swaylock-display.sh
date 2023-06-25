#!/bin/sh

time=$(date +'%A, %d. %B  %H:%M')
echo '<span size="20000" foreground="#c6ad8f" face="monospace">'$time'</span>'
echo
echo '<span size="12000" foreground="#cccccc" face="monospace">'$(echo $USER)'@'$(uname -n) on $(uname -sr)'</span>'
echo '<span size="12000" foreground="#cccccc" face="monospace">'$(uptime -p)'</span>'
echo
echo '<span size="12000" foreground="#c6ad8f" face="monospace">'$(playerctl metadata title)'</span>'
echo '<span size="12000" foreground="#c6ad8f" face="monospace">'$(playerctl metadata artist)'</span>'
