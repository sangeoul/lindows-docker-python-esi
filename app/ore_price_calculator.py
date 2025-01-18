from flask import Flask, render_template, request
from decimal import Decimal
from esi_library import connect_to_db

REPROCESSING_RATE = Decimal('0.876')

def ore_price_calculate():
    selected_items = request.args.getlist('items')

    buy_prices = {}
    results = []

    if not selected_items:
        return render_template('ore_price_calculator.html', results=[], selected_items=selected_items)

    with connect_to_db() as conn:
        with conn.cursor() as cursor:
            # Fetch buy prices for selected items
            cursor.execute(
                "SELECT type_id, price FROM market_price WHERE is_buy_order = TRUE AND type_id IN %s",
                (tuple(selected_items),)
            )
            for row in cursor.fetchall():
                buy_prices[row[0]] = row[1]

            for item in selected_items:
                cursor.execute(
                    "SELECT ir.input_id, ir.input_amount, ti.name_en, mp.price "
                    "FROM industry_relation ir "
                    "JOIN type_info ti ON ir.input_id = ti.type_id "
                    "JOIN market_price mp ON ir.input_id = mp.type_id "
                    "WHERE ir.output_id = %s AND ir.industry_type = 1 AND mp.is_buy_order = FALSE",
                    (item,)
                )
                for row in cursor.fetchall():
                    input_id, input_amount, input_name, ore_price = row
                    cursor.execute(
                        "SELECT output_id, output_amount FROM industry_relation WHERE input_id = %s AND output_id IN %s",
                        (input_id, tuple(selected_items))
                    )
                    output_price = sum([output_amount * buy_prices[output_id] for output_id, output_amount in cursor.fetchall()])*REPROCESSING_RATE
                    ore_price *= input_amount
                    price_rate = ore_price / output_price if output_price else 0
                    
                    # Check for duplicates based on input_name
                    if not any(result[0] == input_name for result in results):
                        results.append((input_name, ore_price, output_price, price_rate))

    results.sort(key=lambda x: x[3], reverse=False)

    return render_template('ore_price_calculator.html', results=results, selected_items=selected_items)
