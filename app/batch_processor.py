import psycopg2
import requests
import time
import sys
from esi_library import connect_to_db,SELFAPI_URL

# Database configuration
DB_HOST = "db"
DB_NAME = "esi_market"
DB_USER = "sangeoul"
DB_PASS = "postgresPSWD"

# API endpoint configuration

SELFAPI_ENDPOINT = SELFAPI_URL+"iteminfo?type_id={type_id}"

# Batch processing size
BATCH_SIZE = 50
SLEEP_INTERVAL = 2  # Time in seconds between batch runs


def fetch_type_ids(conn, offset, batch_size):
    """
    Fetch a batch of `type_id` values from the market_price table
    where `is_buy_order` is true, starting from the given offset.
    """
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT DISTINCT type_id 
            FROM market_price 
            WHERE is_buy_order = TRUE 
            ORDER BY type_id 
            LIMIT %s OFFSET %s
        """, (batch_size, offset))
        return [row[0] for row in cursor.fetchall()]


def process_batch(type_ids):
    """Send GET requests to the API endpoint for each type_id."""
    for type_id in type_ids:
        try:
            response = requests.get(SELFAPI_ENDPOINT.format(type_id=type_id))
            if response.status_code == 200:
                print(f"Success: Type ID {type_id} - {response.json()}")
            else:
                print(f"Error: Type ID {type_id} - Status Code {response.status_code}")
        except requests.RequestException as e:
            print(f"Request failed for Type ID {type_id}: {e}")


def main():
    """Main function to process records in batches."""
    print(f"Waiting for server (20s)", flush=True)
    time.sleep(20)
    
    conn = connect_to_db()
    offset = 0  # Start from the beginning
    
    try:
        while True:
            # Fetch the next batch of records
            type_ids = fetch_type_ids(conn, offset, BATCH_SIZE)
            
            # If no records were fetched, stop processing
            if not type_ids:
                print("No more records to process. Exiting.")
                break
            
            print(f"Processing batch starting from offset {offset}: {type_ids}", flush=True)
            
            # Process the current batch of records
            process_batch(type_ids)
            
            # Increment the offset for the next batch
            offset += BATCH_SIZE
            
            # After each batch, we pause for a short period to avoid overwhelming the API
            print(f"Batch processed. Sleeping for {SLEEP_INTERVAL} seconds...")
            sys.stdout.flush()
            time.sleep(SLEEP_INTERVAL)
    
    except Exception as e:
        print(f"Error during processing: {e}", flush=True)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
