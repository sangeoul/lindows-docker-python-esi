#!/bin/bash

# Start cron in the background

# python3 /app/crawler.py

cron &
echo "Cron daemon started at $(date)"

flask run --host=0.0.0.0 --port=8000 



# Tail the correct log file for cron
#tail -f /var/log/crawler.log 
