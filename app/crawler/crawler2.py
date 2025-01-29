import requests
import psycopg2 
from psycopg2.extras import execute_values
import time
import sys
from esi_library import connect_to_db
import gc
import datetime

REGION_THE_FORGE = 10000002
MARKET_BATCH_SIZE = 10000
FETCHING_PAGE_BATCH = 10
API_URL = f"https://esi.evetech.net/latest/markets/{REGION_THE_FORGE}/orders/"
PAGE_BATCH_SIZE = 50  # Number of pages to process in each batch
START_PAGE = 201

def print_with_timestamp(message):
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}", flush=True)

def fetch_market_data():
    page = START_PAGE

    while True:
        batch_orders = []
        for _ in range(PAGE_BATCH_SIZE):
            if page % FETCHING_PAGE_BATCH == 0:
                print(f"Fetching page {page}...", flush=True)
            response = fetch_with_retries(f"{API_URL}?datasource=tranquility&order_type=all&page={page}", 5, 3, page)
            if response is None:
                print(f"Failed to fetch data for page {page} after retries", flush=True)
                break
            if response.status_code == 404:
                print(f"Cannot find page. It may reached the last page({page}), stopping.", flush=True)
                break    
            if
                        if response.status_code != 200:
                print(f"FAILED TO FETCH DATA : {response.status_code}", flush=True)
                break
            try: 
                data = response.json()
            except ValueError:
                print(f"Failed to parse JSON at page {page},", flush=True)
                break
            if isinstance(data, list):
                batch_orders.extend(data)
            else:
                print(f"Unexpected data format: {data}", flush=True)
                break
            page += 1

        if batch_orders:
            process_and_store_data(batch_orders)
            del batch_orders
            del data
            gc.collect()
            #time.sleep(30)
        else:
            break

        if response and response.status_code == 404:
            break

    print(f"Fetched {page-1} pages. (1 page = 1000 orders).", flush=True)
    return

def fetch_with_retries(url, retries=6, delay=5, page=0):
    for attempt in range(retries):
        response = requests.get(url)
        if response.status_code == 200 or response.status_code == 404:
            return response
        print(f"({response.status_code} Error). Retrying page {page}... ({attempt + 1}/{retries})", flush=True)
        time.sleep(delay)
    return None

def process_and_store_data(orders):
    market_data = {}

    for order in orders:
        type_id = order['type_id']
        is_buy_order = order['is_buy_order']
        price = order['price']
        location_id = order['location_id']

        if type_id not in market_data:
            market_data[type_id] = {'lowest_sell': None, 'highest_buy': None}
        
        if location_id != 60003760:
            continue

        if is_buy_order:
            if not market_data[type_id]['highest_buy'] or price > market_data[type_id]['highest_buy']['price']:
                market_data[type_id]['highest_buy'] = order
        else:
            if not market_data[type_id]['lowest_sell'] or price < market_data[type_id]['lowest_sell']['price']:
                market_data[type_id]['lowest_sell'] = order
    
    db_data = []
    for type_id, prices in market_data.items():
        if prices['lowest_sell']:
            db_data.append((
                prices['lowest_sell']['order_id'],
                type_id,
                False,
                prices['lowest_sell']['price'],
                prices['lowest_sell']['volume_remain'],
                REGION_THE_FORGE,
                prices['lowest_sell']['system_id'],
                prices['lowest_sell']['location_id']
            ))
        if prices['highest_buy']:
            db_data.append((
                prices['highest_buy']['order_id'],
                type_id,
                True,
                prices['highest_buy']['price'],
                prices['highest_buy']['volume_remain'],
                REGION_THE_FORGE,
                prices['highest_buy']['system_id'],
                prices['highest_buy']['location_id']
            ))            
    save_to_db(db_data)

def save_to_db(data):
    """Save processed market data to the PostgreSQL database."""
    query = """
        INSERT INTO market_price(order_id, type_id, is_buy_order, price, volume_remain, region_id, system_id, location_id)
        VALUES %s
        ON CONFLICT (type_id, is_buy_order)
        DO UPDATE SET
            price = CASE
                WHEN market_price.updated < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN 
                    EXCLUDED.price
                WHEN market_price.is_buy_order THEN 
                    GREATEST(market_price.price, EXCLUDED.price)
                ELSE 
                    LEAST(market_price.price, EXCLUDED.price)
                END,
            volume_remain = CASE
                WHEN market_price.updated < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN
                    EXCLUDED.volume_remain
                WHEN (market_price.is_buy_order AND EXCLUDED.price > market_price.price)
                    OR (NOT market_price.is_buy_order AND EXCLUDED.price < market_price.price)
                THEN EXCLUDED.volume_remain
                ELSE market_price.volume_remain
                END,
            region_id = CASE
                WHEN market_price.updated < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN
                    EXCLUDED.region_id
                WHEN (market_price.is_buy_order AND EXCLUDED.price > market_price.price)
                    OR (NOT market_price.is_buy_order AND EXCLUDED.price < market_price.price)
                THEN EXCLUDED.region_id
                ELSE market_price.region_id
                END,
            system_id = CASE
                WHEN market_price.updated < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN
                    EXCLUDED.system_id
                WHEN (market_price.is_buy_order AND EXCLUDED.price > market_price.price)
                    OR (NOT market_price.is_buy_order AND EXCLUDED.price < market_price.price)
                THEN EXCLUDED.system_id
                ELSE market_price.system_id
                END,
            location_id = CASE
                WHEN market_price.updated < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN
                    EXCLUDED.location_id
                WHEN (market_price.is_buy_order AND EXCLUDED.price > market_price.price)
                    OR (NOT market_price.is_buy_order AND EXCLUDED.price < market_price.price)
                THEN EXCLUDED.location_id
                ELSE market_price.location_id
                END,
            updated = CASE
                WHEN market_price.updated < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN
                    CURRENT_TIMESTAMP
                WHEN (market_price.is_buy_order AND EXCLUDED.price > market_price.price)
                    OR (NOT market_price.is_buy_order AND EXCLUDED.price < market_price.price)
                THEN CURRENT_TIMESTAMP
                ELSE market_price.updated
                END;
    """

    try:
        with connect_to_db() as dbconn:
            with dbconn.cursor() as cursor:
                for i in range(0, len(data), MARKET_BATCH_SIZE):
                    batch = data[i:i + MARKET_BATCH_SIZE]
                    execute_values(cursor, query, batch)
                    print(f"{i + MARKET_BATCH_SIZE} data updated to DB.", flush=True)
            dbconn.commit()
        print_with_timestamp(f"Inserted/updated {len(data)} rows in the database.")
    except Exception as e:
        print(f"Error occurred: {e}", flush=True)

if __name__ == "__main__":
    print_with_timestamp("Starting Market Updater for pages 201 to last")
    sys.stdout.flush()
    fetch_market_data()
    print_with_timestamp("Market update finished for pages 201 to last.")
