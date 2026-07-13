function ghostty-restart --description 'Restart the headless ghostty daemon (kill current, respawn detached)'
    setsid -f fish -c '
        for i in (seq 50)
            pgrep -x ghostty >/dev/null; or break
            sleep 0.1
        end
        exec ghostty --initial-window=false
    ' >/dev/null 2>&1

    pkill -x ghostty
end
