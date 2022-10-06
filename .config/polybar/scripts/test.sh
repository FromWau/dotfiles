#!/bin/bash
   
INDEX=0
 
while [ $INDEX -lt 20 ]
do
    echo "$INDEX" & sleep 1
done
echo "DONE"
