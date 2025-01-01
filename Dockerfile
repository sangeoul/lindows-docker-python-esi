# Use the official Python base image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Install necessary packages, including cron
RUN apt-get update && apt-get install -y cron 
RUN apt-get update && apt-get install -y procps
#RUN apt-get update && apt-get install -y systemctl
#RUN apt-get update && apt-get install -y curl
#RUN apt-get update && apt-get install -y nano
#RUN apt-get update && apt-get install -y rsyslog


# Copy the requirements.txt file into the container
COPY requirements.txt /app/requirements.txt

# Install the necessary Python libraries
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the entire project into the container
COPY . /app/
COPY app/appstart.sh /app/appstart.sh

# Install Gunicorn (WSGI server)
RUN pip install gunicorn

# Expose port 8000 for Gunicorn
EXPOSE 8000


# Create the log file and set permissions
#RUN touch /var/log/cron.log && chmod 666 /var/log/cron.log
RUN touch /var/log/crawler.log && chmod 666 /var/log/crawler.log
#RUN touch /var/log/cron_env.log && chmod 666 /var/log/cron_env.log


# Add the cron job
#RUN echo "*/30 * * * * /usr/local/bin/python3 /app/crawler.py >> /var/log/crawler.log 2>&1" >> /etc/cron.d/crawler
RUN echo "0 * * * * /usr/local/bin/python3 /app/crawler.py 2>&1 | tee -a /var/log/crawler.log > /proc/1/fd/1"  >> /etc/cron.d/crawler

# Add the cron test job 
#RUN echo "*/30 * * * * root /usr/bin/date >> /var/log/crawler.log 2>&1">> /etc/cron.d/crawler


# Apply cron job
RUN chmod 0664 /etc/cron.d/crawler && crontab /etc/cron.d/crawler

# Start cron and API page.
RUN ls -al /app/
RUN chmod +x /app/appstart.sh
CMD ["/usr/bin/bash", "/app/appstart.sh"]
#CMD ["python3", "/app/crawler.py"]

# cron log
# RUN crontab -l