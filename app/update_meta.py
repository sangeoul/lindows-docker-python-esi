import requests
import datetime
from psycopg2.extras import DictCursor
from esi_library import connect_to_db

CHUNK_SIZE = 300  # Adjust chunk size as needed

def fetch_meta_level(input_id):
    url = f'https://esi.evetech.net/latest/universe/types/{input_id}/?datasource=tranquility&language=en'
    response = requests.get(url)
    if response.status_code == 200:
        json_data = response.json()
        # Initialize meta_level as None
        meta_level = None
        if 'dogma_attributes' in json_data:
            for attribute in json_data['dogma_attributes']:
                if attribute['attribute_id'] == 633:
                    meta_level = attribute['value']
                    break

        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if meta_level==None:
            print(f"[{timestamp}]{json_data['name']} has no meta level",flush=True)
        else:
            print(f"[{timestamp}]{json_data['name']} has meta level {meta_level}",flush=True)
        


        return meta_level
    else:
        raise Exception(f"Failed to fetch data for input_id {input_id}, status code: {response.status_code}")

def update_type_info(conn, input_id, meta_level):
    try:
        with conn.cursor() as cursor:
            update_query = """
            UPDATE type_info
            SET meta_level = %s
            WHERE type_id = %s
            """
            cursor.execute(update_query, (meta_level, input_id))
            conn.commit()
    except Exception as e:
        print(f"Error updating type_info for input_id {input_id}: {e}")

def delete_from_industry_relation(conn, input_id):
    try:
        with conn.cursor() as cursor:
            delete_query = """
            DELETE FROM industry_relation
            WHERE input_id = %s AND industry_type = 1
            """
            cursor.execute(delete_query, (input_id,))
            conn.commit()
    except Exception as e:
        print(f"Error deleting from industry_relation for input_id {input_id}: {e}")

def process_chunk(conn, chunk):
    for row in chunk:
        input_id = row['input_id']
        try:
            meta_level = fetch_meta_level(input_id)
            update_type_info(conn, input_id, meta_level)
            if meta_level is not None and meta_level >= 5:
                delete_from_industry_relation(conn, input_id)
        except Exception as e:
            print(f"Error processing input_id {input_id}: {e}")

def main():
    conn = connect_to_db()
    
    try:
        with conn.cursor(cursor_factory=DictCursor) as cursor:
            select_query = """
            SELECT DISTINCT input_id
            FROM industry_relation
            WHERE input_amount = 1 AND industry_type = 1
            """
            cursor.execute(select_query)
            input_ids = cursor.fetchall()
            
            # Process data in chunks
            for i in range(0, len(input_ids), CHUNK_SIZE):
                chunk = input_ids[i:i + CHUNK_SIZE]
                process_chunk(conn, chunk)
                
    finally:
        conn.close()

if __name__ == "__main__":
    main()
