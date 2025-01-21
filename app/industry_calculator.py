from flask import Flask, render_template
from esi_library import connect_to_db  # Update with your actual database module


def industry_calculator():
    conn = connect_to_db()
    cursor = conn.cursor()

    # Fetch blueprint data
    cursor.execute("""
        SELECT DISTINCT output_id, output_name
        FROM industry_relation
        WHERE industry_type > 1
    """)
    blueprints = cursor.fetchall()

    cursor.close()
    conn.close()

    # Pass blueprint data to template
    return render_template("industry_calculator.html", blueprints=blueprints)
