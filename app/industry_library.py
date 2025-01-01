import requests
from datetime import datetime, timedelta
import json
from esi_library import connect_to_db,SELFAPI_URL


def get_typeid_by_itemname(item_name, language='en'):
    conn = connect_to_db()
    cursor = conn.cursor()

    # Attempt to fetch the type_id from the database
    if language == 'ko':
        cursor.execute("SELECT type_id FROM type_info WHERE name_ko = %s", (item_name,))
    else:  # Default to 'en'
        cursor.execute("SELECT type_id FROM type_info WHERE name_en = %s", (item_name,))
    type_info = cursor.fetchone()

    if type_info:
        # Return the type_id from the database
        cursor.close()
        conn.close()
        return type_info[0]

    # If not found in the database, query the external API
    endpoint = f"{SELFAPI_URL}/iteminfo?itemname={item_name}"
    response = requests.get(endpoint)

    if response.status_code == 200:
        # Parse the API response and extract type_id
        api_data = response.json()
        return api_data.get('type_id')  # Return the type_id directly
    else:
        # Handle API errors
        raise ValueError(f"Error fetching data from API: {response.status_code} - {response.text}")


def get_itemname_by_typeid(type_id, language='en'):
    conn = connect_to_db()
    cursor = conn.cursor()

    # Attempt to fetch the type_id from the database
    if language == 'ko':
        cursor.execute("SELECT name_ko FROM type_info WHERE type_id = %s", (type_id,))
    else:  # Default to 'en'
        cursor.execute("SELECT name_en FROM type_info WHERE type_id = %s", (type_id,))
    type_info = cursor.fetchone()

    if type_info:
        # Return the type_id from the database
        cursor.close()
        conn.close()
        return type_info[0]

    # If not found in the database, query the external API
    endpoint = f"{SELFAPI_URL}/iteminfo?type_id={type_id}"
    response = requests.get(endpoint)

    if response.status_code == 200:
        # Parse the API response and extract type_id
        api_data = response.json()
        if language == 'ko':
            return api_data.get('name_ko')  # Return the Korean name
        else:
            return api_data.get('name_en')  # Return the English name as default.
    else:
        # Handle API errors
        raise ValueError(f"Error fetching data from API: {response.status_code} - {response.text}")
 
def get_groupid_by_typeid(type_id):
    conn = connect_to_db()
    cursor = conn.cursor()

    cursor.execute("SELECT group_id FROM type_info WHERE type_id = %s", (type_id,))
    type_info = cursor.fetchone()

    if type_info:
        # Return the type_id from the database
        cursor.close()
        conn.close()
        return type_info[0]

    # If not found in the database, query the external API
    endpoint = f"{SELFAPI_URL}/iteminfo?type_id={type_id}"
    response = requests.get(endpoint)

    if response.status_code == 200:
        # Parse the API response and extract type_id
        api_data = response.json()
        return api_data.get('group_id')  # Return the English name as default.
    else:
        # Handle API errors
        raise ValueError(f"Error fetching data from API: {response.status_code} - {response.text}")
        

def get_icon_by_typeid(type_id,icon_type="icon"):
    conn = connect_to_db()
    cursor = conn.cursor()

    # Attempt to fetch the type_id from the database
    cursor.execute("SELECT type_id,icon_type FROM type_info WHERE type_id = %s", (type_id,))
    icon_type = cursor.fetchone()
    
    if icon_type:
        # Return the type_id from the database
        if icon_type[1]:
            cursor.close()
            conn.close()
            icon_type_array=icon_type[1].split(',')
            try:
                icon_type_index = icon_type_array.index(icon_type)
            except ValueError:
                icon_type="default"

        else:
            
            #headers = {
            #        "Accept": "application/json",
            #        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
            #        }

            response = requests.get(f"https://images.evetech.net/types/{type_id}/")
            icon_type_array=response.json()
            
            icon_string=",".join(icon_type_array)
            
            try:
                cursor.execute("""UPDATE type_info
                                SET icon_type = %s 
                                WHERE type_id = %s""",(icon_string,type_id))
            except Exception as e:
                print (f"DB query error with {icon_string}")
                
        try:
            icon_type_index = icon_type_array.index(icon_type)  
        except ValueError:
            icon_type="default"

        if icon_type=="default":
            if icon_type_array:
                return f"https://images.evetech.net/types/{type_id}/{icon_type_array[0]}"
            else:   
                return ""
        else:
            return f"https://images.evetech.net/types/{type_id}/{icon_type_array[icon_type_index]}"


    # If not found in the database,just return ""
    return ""


def get_sell_buy(type_id):
    
    try: 
        conn = connect_to_db()
        cursor = conn.cursor()

        # Fetch sell price
        try: 
            cursor.execute(""" 
            SELECT price FROM market_price 
            WHERE type_id = %s AND is_buy_order = false 
            ORDER BY price ASC LIMIT 1 
            """, (type_id,))
            sellprice = cursor.fetchone()
            sellprice = float(sellprice[0]) if sellprice else 0.0
        except: 
            sellprice = 0.0

        # Fetch buy price
        try: 
            cursor.execute(""" 
            SELECT price FROM market_price 
            WHERE type_id = %s AND is_buy_order = true 
            ORDER BY price DESC LIMIT 1 
            """, (type_id,))
            buyprice = cursor.fetchone()
            buyprice = float(buyprice[0]) if buyprice else 0.0
        except: 
            buyprice = 0.0
        return sellprice, buyprice

    except Exception as e:
        print(f"DB connection error: {e}", flush=True)
        return 0, 0
