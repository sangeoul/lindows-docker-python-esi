from flask import Flask, jsonify, request, make_response
import psycopg2
import os   
from esi_library import connect_to_db
from industry_library import REGION_THE_FORGE, STATION_JITA

app = Flask(__name__)

@app.route('/api/jitaprice', methods=['GET', 'POST'])
def get_prices():
    """Fetch highest buy and lowest sell prices for a given type_id"""

    is_post = request.args.get('is_post')

    if not is_post:
        is_post = 0
    else:
        is_post = int(is_post)

    if is_post == 0:
        type_id = request.args.get('type_id')
        if not type_id:
            return jsonify({"error": "type_id is required"}), 400

        try:
            type_id = int(type_id)
        except ValueError:
            return jsonify({"error": "invalid type_id"}), 400
        
        try:
            # Handle single item.
            with connect_to_db() as dbconn:
                with dbconn.cursor() as cursor:
                    # Query to fetch the highest buy and lowest sell prices for the given type_id
                    cursor.execute(f"""
                        SELECT 
                            is_buy_order, price 
                        FROM 
                            market_price
                        WHERE 
                            type_id = %s AND region_id = %s AND location_id = %s
                        ORDER BY 
                            price DESC
                    """, (type_id, REGION_THE_FORGE, STATION_JITA))

                    rows = cursor.fetchall()
                    
                    if not rows:
                        return jsonify({"error": f"No data found for type_id {type_id}"}), 404
                    
                    highest_buy = None
                    lowest_sell = None

                    # Parse the results
                    for row in rows:
                        is_buy_order, price = row
                        if is_buy_order:
                            highest_buy = price
                        else:
                            lowest_sell = price

                    response = jsonify({
                        "type_id": type_id,
                        "buy": highest_buy,
                        "sell": lowest_sell,
                    })
                    response.headers['Cache-Control'] = 'public, max-age=1800'  # 30 minutes
                    return response
        except Exception as e:
            response = jsonify({"error": str(e)})
            response.headers['Cache-Control'] = 'no-cache'
            return response, 500
    
    elif is_post == 1: 
        # Handle multiple items.
        item_list = request.get_json()
        
        if not isinstance(item_list, list):
            return jsonify({"error": "Expected a list of type_ids"}), 400

        if not all(isinstance(item, int) for item in item_list):
            return jsonify({"error": "All type_ids should be integers"}), 400

        try:
            with connect_to_db() as dbconn:
                with dbconn.cursor() as cursor:
                    # Build the SQL query with placeholders
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
                        response = jsonify({"error": f"No data found for the given type_ids"})
                        response.headers['Cache-Control'] = 'no-cache'
                        return response, 404
                    
                    prices={}

                    # Parse the results
                    for row in rows:
                        type_id, is_buy_order, price = row
                        if type_id not in prices:
                            prices[type_id] = {"highest_buy": None, "lowest_sell": None}
                        if is_buy_order:
                            if prices[type_id]["highest_buy"] is None:
                                prices[type_id]["highest_buy"] = price
                        else:
                            if prices[type_id]["lowest_sell"] is None:
                                prices[type_id]["highest_buy"] = price

                    response = jsonify({
                        "prices": [
                            {
                                "type_id": type_id,
                                "buy": prices[type_id]["highest_buy"],
                                "sell": prices[type_id]["highest_buy"]
                            }
                            for type_id in prices
                        ]
                    })
                    response.headers['Cache-Control'] = 'public, max-age=1800'  # 30 minutes
                    return response
        except Exception as e:
            response = jsonify({"error": str(e)})
            response.headers['Cache-Control'] = 'no-cache'
            return response, 500

    else:
        response = jsonify({"error": "Unknown is_post parameter."})
        response.headers['Cache-Control'] = 'no-cache'
        return response, 404

#if __name__ == "__main__":
#    app.run(host='0.0.0.0', port=8000)
