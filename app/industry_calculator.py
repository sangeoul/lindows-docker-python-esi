from flask import Flask, render_template
from esi_library import connect_to_db  # Update with your actual database module


def industry_calculator():

    # Pass blueprint data to template
    return render_template("industry_calculator.html")
