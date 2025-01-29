# Start cron in the background
# python3 crawler.py

cron &
echo "Cron daemon started at $(date)"

# Tail the correct log file for cron
tail -f /var/log/crawler.log 
