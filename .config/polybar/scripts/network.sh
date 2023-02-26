#!/bin/bash


check_iwd() {

    # Chck if iwctl is installed
    command -v rofi-wifi-menu >/dev/null 2>&1 || {\
        echo >&2 "I require iwctl but it's not installed.  Aborting."; \
        exit 1; }

    # Check if iwd.conf exists
    [ -f /etc/NetworkManager/conf.d/iwd.conf ] || {\
        echo >&2 "iwd.conf for NetworkManager not found. Aborting."; \
        ecit 1; }

}


case "$1" in
    "connect") 
        check_iwd
        rofi-wifi-menu
    ;;
    *)
            connected=$(nmcli device status | grep -w connected | grep -v "loopback")
        dev="$( echo "$connected" | awk '{print $1}' )"


        case "$( echo "$connected" | awk '{print $2}')" in
            "wifi")
                dev_icon=" "
                ;;
            "ethernet")
                dev_icon=" "
                ;;
            *)
                echo "no connection? -- $connected" 
                exit 1
                ;;
        esac

        LINE=`grep "$dev" /proc/net/dev | sed s/.*://`;
        RECEIVED1=`echo $LINE | awk '{print $1}'`
        TRANSMITTED1=`echo $LINE | awk '{print $9}'`
        sleep 1
        LINE=`grep "$dev" /proc/net/dev | sed s/.*://`;
        RECEIVED2=`echo $LINE | awk '{print $1}'`
        TRANSMITTED2=`echo $LINE | awk '{print $9}'`
        
        INSPEED=$(($RECEIVED2-$RECEIVED1))
        OUTSPEED=$(($TRANSMITTED2-$TRANSMITTED1))

        printf "$dev_icon   %6i KB/s   %6i KB/s \n" $(($INSPEED/1024)) $(($OUTSPEED/1024)) ;
    ;;

esac







