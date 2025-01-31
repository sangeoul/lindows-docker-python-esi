from flask import Flask ,jsonify, send_from_directory
from flask_cors import CORS
from handle_sso import oauth_redirect, callback  # Import OAuth routes from handle_sso.py
from iteminfo import get_type_info
from jitaprice import get_prices
from industry_relation_info import get_industry_relation_info
import os
app = Flask(__name__)

###
CORS(app, origins=["https://lindows.kr:8001"])
###
# Define the path to the static folder
base_dir = os.path.dirname(os.path.abspath(__file__))

# Use the imported routes from handle_sso.py
app.add_url_rule('/api/iteminfo', 'iteminfo', get_type_info, methods=['GET'])
app.add_url_rule('/api/jitaprice', 'jitaprice', get_prices, methods=['GET','POST'])
app.add_url_rule('/api/industry_relation_info', 'get_industry_relation_info', get_industry_relation_info, methods=['GET'])


# Route to serve the JSON file
@app.route('/api/reaction_formulas', methods=['GET'])
def get_reaction_formulas():
    # Send the JSON file from the static folder
    filedir=os.path.join(base_dir, 'static','json')
    return send_from_directory(filedir,  'reactions.json', as_attachment=False, mimetype='application/json')

@app.route('/api/manufacturing_blueprints', methods=['GET'])
def get_manufacturing_blueprints():
    # Send the JSON file from the static folder
    filedir=os.path.join(base_dir, 'static','json')
    return send_from_directory(filedir, 'manufacturings.json', as_attachment=False, mimetype='application/json')

from flask import Flask, send_file

app = Flask(__name__)

@app.route('/bONOBONO')
def bONOBONO():
    try:
        # Path to the image file
        filedir=os.path.join(base_dir, 'static','img','bonobono.webp')
        # Send the image file
        return send_file(filedir, mimetype='image/png')
    except Exception as e:
        return str(e)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8009)
