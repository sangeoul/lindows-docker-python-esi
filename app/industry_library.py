import requests
from datetime import datetime, timedelta
import json
from esi_library import connect_to_db
from iteminfo import get_type_info

REGION_THE_FORGE = 10000002
STATION_JITA = 60003760

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

    try :
        api_data=get_type_info(0,item_name)
        return api_data.get('type_id') 
    
    except:
        raise ValueError(f"Error fetching data")
    
def get_typeid_by_itemnamelist(item_name_list, language='en'):
    conn = connect_to_db()
    cursor = conn.cursor()

    # Attempt to fetch the type_id from the database
    if language == 'ko':
        cursor.execute("SELECT type_id,name_ko as name FROM type_info WHERE name_ko =  ANY(%s)", (item_name_list,))
    else:  # Default to 'en'
        cursor.execute("SELECT type_id,name_en as name FROM type_info WHERE name_en = ANY(%s)", (item_name_list,))
    rows = cursor.fetchall()

    if not rows:
        return {}
            
    typeids={}

    # Parse the results
    for row in rows:
        type_id, name = row
        if type_id not in typeids:
            typeids[name]=int(type_id)

    return typeids
        


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

    try :
        api_data=get_type_info(type_id,"")
        if language=='ko':
            return api_data.get('name_ko') 
        else :
            return api_data.get('name_en') 
    
    except:
        raise ValueError(f"Error fetching data")
 
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


    try :
        api_data=get_type_info(type_id,"")
        return api_data.get('group_id') 
    
    except:
        raise ValueError(f"Error fetching data")

def get_icon_by_typeid(type_id,icon_type="icon"):

    return f"https://images.evetech.net/types/{type_id}/icon"

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


def get_affordable_price(item_list):
    
    try: 
        conn = connect_to_db()
        cursor = conn.cursor()

        # Fetch sell price
        try: 
            query = f"""
                    SELECT 
                        type_id, is_buy_order, price 
                    FROM 
                        market_price
                    WHERE 
                        type_id = ANY(%s) AND region_id = %s AND location_id = %s
                    ORDER BY 
                        type_id ASC, price DESC
                """
            cursor.execute(query, (item_list, REGION_THE_FORGE, STATION_JITA))

            rows = cursor.fetchall()
                    
            if not rows:
                return {}
        
            prices={}

            # Parse the results
            for row in rows:
                type_id, is_buy_order, price = row
                if type_id not in prices:
                    prices[type_id]={"buy":None, "sell":None}
                if is_buy_order:
                    if prices[type_id]["buy"] is None:
                        prices[type_id]["buy"] = float(price)
                else:
                    if prices[type_id]["sell"] is None:
                        prices[type_id]["sell"] = float(price)
            
            return prices
        except: 
            return {}
        
    except Exception as e:
        print(f"DB connection error: {e}", flush=True)
        return 0, 0
