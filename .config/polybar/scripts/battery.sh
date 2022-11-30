#!/bin/bash


percentage=$(upower -i /org/freedesktop/UPower/devices/battery_BAT0 | awk '/percentage/ { gsub("%",""); print $2  }')
state=$(upower -i /org/freedesktop/UPower/devices/battery_BAT0 | awk '/state/ { print $2  }')



if [ "$percentage" -eq "100" ]
then

    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 90 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 80 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 60 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 40 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 30 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 20 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -ge 10 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

elif [ "$percentage" -lt 10 ]
then
    
    if [ "$state" == "charging" ]
    then
        state_icon=" "
    else
        state_icon=" " 
    fi

fi


echo "$state_icon $percentage%"





