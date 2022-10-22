#!/bin/sh


info_to_icon() {    
    case $1 in
        'Sunny')
            echo '☀ ';;
        'Clear Night')
            echo ' ';;
        'Mostly Sunny')
            echo ' ';;
        'Partly Cloudy')
            echo ' ';;
        'Partly Cloudy Night')
            echo ' ';;
        'Mostly Cloudy')
            echo ' ';;
        'Mostly Cloudy Night')
            echo ' ';;
        'Cloudy')
            echo ' ';;
        'Scattered Showers')
            echo ' ';;
        'Rain')
            echo ' ';;
        *)
            echo "$1";;
        esac
}

json=$(python weather_scraper.py 5d3ac36b50e4aa01e9916508005d45eab1dffb15cb59d5b38cce3ca54d24c65d)
weather=$(echo "$json" | jq '.location.forecasts' | jq '.[0].weather')


# forecast 1
tmp1=$(echo "$weather" | jq -r '.[0].temperature')
info1=$(echo "$weather" | jq -r '.[0].info')
tmp1_num=$(echo "$tmp1" | tr -d '°')
icon1=$(info_to_icon "$info1")

# forecast 2
tmp2=$(echo "$weather" | jq -r '.[1].temperature')
info2=$(echo "$weather" | jq -r '.[1].info')
tmp2_num=$(echo "$tmp2" | tr -d '°')
icon2=$(info_to_icon "$info2")

# Set the arrow for the corresponding diff temps
if [ "$tmp1_num" -lt "$tmp2_num" ]; 
then
    tmp_diff='↗ '
elif [ "$tmp1_num" -eq "$tmp2_num" ];
then
    tmp_diff='→ '
else
    tmp_diff='↘ '
fi

echo "$icon1 $tmp1 $tmp_diff $icon2 $tmp2"

