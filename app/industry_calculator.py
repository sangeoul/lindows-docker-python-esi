from flask import Flask, render_template
from esi_library import connect_to_db  # Update with your actual database module


def industry_calculator():
    conn = connect_to_db()
    cursor = conn.cursor()

    # Fetch blueprint data with names from type_info table
    cursor.execute("""
        SELECT DISTINCT ir.output_id, ti.name_en
        FROM industry_relation ir
        JOIN type_info ti ON ir.output_id = ti.type_id
        WHERE ir.industry_type > 1
    """)
    blueprints = cursor.fetchall()

    cursor.close()
    conn.close()

    # Pass blueprint data to template
    return render_template("industry_calculator.html", blueprints=blueprints)
