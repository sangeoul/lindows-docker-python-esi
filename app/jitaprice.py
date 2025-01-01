from flask import Flask, jsonify,request
import psycopg2
import os   
from esi_library import connect_to_db

REGION_THE_FORGE=10000002
STATION_JITA=60003760

app=Flask(__name__)


@app.route('/api/jitaprice',methods=['GET'])
def get_prices():
    """Fetch highest buy and lowest sell prices for a given type_id"""
    type_id=request.args.get('type_id')

    if not type_id:
        return jsonify({"error":"type_id is required"}),400
    try:
        type_id = int(type_id)
    except ValueError:
        return jsonify({"error":"invalid type_id"}),400
    
    try:
        with connect_to_db() as dbconn:
            with dbconn.cursor() as cursor:
                # Query to fetch the highest buy and lowest sell prices for the given type_id
                cursor.execute(f"""
                    SELECT 
                        is_buy_order, price 
                    FROM 
                        market_price
                    WHERE 
                        type_id = {type_id} AND region_id = {REGION_THE_FORGE} AND location_id = {STATION_JITA}
                    ORDER BY 
                        price DESC
                """)

                rows = cursor.fetchall()
                
                if not rows:
                    return jsonify({"error":f"No data found for type_id {type_id}"}),404
                
                highest_buy=None
                lowest_sell=None

                # Parse the results
                for row in rows:
                    is_buy_order, price = row
                    if is_buy_order:
                        highest_buy = price
                    else:
                        lowest_sell = price

                return jsonify({
                    "type_id": type_id,
                    "buy": highest_buy,
                    "sell": lowest_sell
                })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#if __name__ == "__main__":
#    app.run(host='0.0.0.0', port=8000)