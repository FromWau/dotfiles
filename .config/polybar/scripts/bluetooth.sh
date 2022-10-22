#!/bin/sh

bluetooth_status() {
    if [ "$(systemctl is-active "bluetooth.service")" = "inactive" ]; 
    then
        echo "  Service not running "
    elif [ "$(bluetoothctl show | grep "Powered: yes" | wc -c)" -eq 0 ]
    then
        echo "  Modul not powered"
    else 
        if [ "$(bluetoothctl devices Connected | wc -c)" -eq 0 ]
        then 
            echo "  Manager"
        else
            out=""
            while read -r lines; 
            do
                device_uuid=$( echo "$lines" | awk -F ' ' '{print $2}' )
                device_name=$( echo "$lines" | awk -F ' ' '{print $3}' )
                device_type=$( bluetoothctl info "$device_uuid" | grep 'Icon: ' | awk -F ' ' '{print $2}' )
                device_battery=$( bluetoothctl info "$device_uuid" | grep 'Battery Percentage: ' | awk -F '[()]' '{print $2}' )
                if [ -n "$device_battery" ];
                then
                    device_battery=" $device_battery%"
                fi

                case $device_type in
                    'phone') 
                        device_type=''
                        ;;
                    'audio-headset')
                        device_type=''
                        ;;
                esac
                out="$out $device_name $device_type$device_battery "

            done <<EOF
            $(bluetoothctl devices Connected) 
EOF
            
            printf "%s\n" "$out"; 
        fi    
    fi
}


bluetooth_toggle() {
    if [ "$(bluetoothctl show | grep "Powered: yes" | wc -c)" -eq 0 ];
    then
      bluetoothctl power on
    else
      bluetoothctl power off
    fi
}


case "$1" in
    --toggle)
        bluetooth_toggle
        ;;
    *)
        bluetooth_status
        ;;
esac

