import os
import requests
from flask import Flask, request, Response
import psycopg2
import json
from esi_library import connect_to_db, get_access_token

# Initialize Flask app
#app = Flask(__name__)

# External API URLs
EXTERNAL_API_URL = "https://esi.evetech.net/latest/universe/types/{type_id}/?datasource=tranquility&language={language}"
SEARCH_API_URL = "https://esi.evetech.net/latest/characters/92371624/search/?categories=inventory_type&datasource=tranquility&language=en&strict=true&search={item_name}"

# Hardcoded ID and service for access token retrieval
ID = 92371624
SERVICE = 'market'

# Helper function to fetch data from the external API by type_id
def fetch_external_data(type_id, language="en"):
    url = EXTERNAL_API_URL.format(type_id=type_id, language=language)
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None

# Helper function to fetch type_id by English item name
def fetch_type_id_by_name(item_name):

    conn = connect_to_db()
    cursor = conn.cursor()

    cursor.execute("SELECT type_id FROM type_info WHERE name_en = %s OR name_ko = %s", (item_name,item_name))
    type_info = cursor.fetchone()

    if type_info:
        # Return the data from the database if found
        cursor.close()
        conn.close()
        return type_info[0]

    access_token = get_access_token(ID, SERVICE)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = SEARCH_API_URL.format(item_name=item_name)
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        search_results = response.json()

        if "inventory_type" in search_results:
            # If more than one type_id is returned, treat as an error
            if len(search_results["inventory_type"]) == 1:
                return search_results["inventory_type"][0]
            else:
                return None  # Multiple results, considered an error
        return None  # No results found
    elif response.status_code == 400:
        error_response = response.json()

        return None if "error" in error_response else None  # Handle specific error if needed
    return None  # Fallback for unexpected errors



# API endpoint for retrieving type info by type_id or itemname
#@app.route('/api/iteminfo', methods=['GET'])
def get_type_info(type_id=0,item_name=None):
    # Get the type_id and itemname from the query parameters

    if type_id == None or type_id==0 :
        type_id = request.args.get('type_id', type=int)
    if item_name == None or item_name=="":
        item_name = request.args.get('itemname', type=str)
    if type_id is None and item_name is None:
        return Response(
            json.dumps({"error": "type_id or itemname is required"}, ensure_ascii=False),
            status=400,
            content_type='application/json'
        )

    conn = connect_to_db()
    cursor = conn.cursor()
    
    if item_name and not type_id:
        # Fetch type_id by item name
        
        type_id = fetch_type_id_by_name(item_name)
        if not type_id:
            return Response(
                json.dumps({"error": "type_id not found for the given item name or multiple results found"}, ensure_ascii=False),
                status=404,
                content_type='application/json'
            )

    if type_id:
        # Proceed with fetching type info as before
        cursor.execute("SELECT type_id,name_en,name_ko,volume,packaged_volume,icon_id,icon_type,group_id,published,market_group_id FROM type_info WHERE type_id = %s", (type_id,))
        type_info = cursor.fetchone()

        if type_info:
            # Return the data from the database if found
            cursor.close()
            conn.close()
            return Response(
                json.dumps({
                    "type_id": type_info[0],
                    "name_en": type_info[1],
                    "name_ko": type_info[2],
                    "volume": type_info[3],
                    "packaged_volume": type_info[4],
                    "icon_id": type_info[5],
                    "icon_type": type_info[6],
                    "group_id": type_info[7],
                    "published": type_info[8],
                    "market_group_id": type_info[9]
                }, ensure_ascii=False),
                status=200,
                content_type='application/json'
            )
        
        else:
            # Fetch data from the external API if not in the database
            external_data_en = fetch_external_data(type_id, language="en")
            external_data_ko = fetch_external_data(type_id, language="ko")

            if external_data_en and external_data_ko:

                # Set default value for market_group_id if it does not exist 
                market_group_id = external_data_en.get('market_group_id', 0)

                # Prepare data to save
                icon_id = external_data_en.get('icon_id', type_id)
                cursor.execute("""
                    INSERT INTO type_info (type_id, name_en, name_ko, volume, packaged_volume, icon_id, group_id, published, market_group_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING type_id, name_en, name_ko, volume, packaged_volume, icon_id, group_id, published, market_group_id
                """, (
                    external_data_en['type_id'],
                    external_data_en['name'],
                     external_data_ko.get('name', ""),
                    external_data_en['volume'],
                    external_data_en['packaged_volume'],
                    icon_id,
                    external_data_en['group_id'],
                    external_data_en['published'],
                    market_group_id
                ))

                # Commit changes to the database
                new_type_info = cursor.fetchone()
                conn.commit()

                # Return the data from the external API
                cursor.close()
                conn.close()

                print(f"New item is registered.\"{external_data_en['name']}\"(type_id:{external_data_en['type_id']})",flush=True)
                return Response(
                    json.dumps({
                        "type_id": new_type_info[0],
                        "name_en": new_type_info[1],
                        "name_ko": new_type_info[2],
                        "volume": new_type_info[3],
                        "packaged_volume": new_type_info[4],
                        "icon_id": new_type_info[5],
                        "group_id": new_type_info[6],
                        "published": new_type_info[7],
                        "market_group_id": new_type_info[8]
                    }, ensure_ascii=False),
                    status=200,
                    content_type='application/json'
                )
            else:
                cursor.close()
                conn.close()
                return Response(
                    json.dumps({"error": "Item not found in the external API"}, ensure_ascii=False),
                    status=404,
                    content_type='application/json'
                )

#if __name__ == "__main__":
#    app.run(host="0.0.0.0", port=8000)
