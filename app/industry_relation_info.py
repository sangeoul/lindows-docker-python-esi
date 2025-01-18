import os
from flask import Response, Flask, request
import json
from esi_library import connect_to_db
from industry_library import get_itemname_by_typeid

def get_industry_relation_info():
    # Get the type_id and industry_type from the query parameters
    type_id = request.args.get('type_id')
    industry_type = request.args.get('industry_type', type=int)

    if not type_id:
        return Response(
            json.dumps({"error": "type_id or itemname is required"}, ensure_ascii=False),
            status=400,
            content_type='application/json'
        )

    conn = connect_to_db()
    cursor = conn.cursor()
    
    # Fetch type info based on industry_type
    if industry_type > 1:
        cursor.execute("SELECT output_id, output_amount, input_id, input_amount, industry_type FROM industry_relation WHERE output_id = %s AND industry_type > 1", (type_id,))
    else:
        cursor.execute("SELECT output_id, output_amount, input_id, input_amount, industry_type FROM industry_relation WHERE input_id = %s AND industry_type = 1", (type_id,))

    industry_relation = cursor.fetchall()

    if industry_relation:
        # Return the data from the database if found
        relation_data = []

        for relation in industry_relation:
            output_id = relation[0]
            output_amount = relation[1]
            input_id = relation[2]
            input_amount = relation[3]
            industry_type = relation[4]

            output_name = get_itemname_by_typeid(output_id)
            input_name = get_itemname_by_typeid(input_id)

            relation_data.append({
                "output_id": output_id,
                "output_name": output_name,
                "output_amount": output_amount,
                "input_id": input_id,
                "input_name": input_name,
                "input_amount": input_amount
            })

        cursor.close()
        conn.close()

        return Response(
            json.dumps({
                "industry_type": industry_type,
                "relation": relation_data
            }, ensure_ascii=False),
            status=200,
            content_type='application/json'
        )
    else:
        cursor.close()
        conn.close()

        return Response(
            json.dumps({
                "industry_type": 0,
                "relation": []
            }, ensure_ascii=False),
            status=200,
            content_type='application/json'
        )

#if __name__ == "__main__":
#    app.run(host="0.0.0.0", port=8000)
