from flask import Flask 
from flask_cors import CORS
from handle_sso import oauth_redirect, callback  # Import OAuth routes from handle_sso.py
from iteminfo import get_type_info
from jitaprice import get_prices
from industry_relation_info import get_industry_relation_info
app = Flask(__name__)

###
CORS(app, origins=["https://lindows.kr:8001"])
###

# Use the imported routes from handle_sso.py
app.add_url_rule('/api/iteminfo', 'iteminfo', get_type_info, methods=['GET'])
app.add_url_rule('/api/jitaprice', 'jitaprice', get_prices, methods=['GET'])
app.add_url_rule('/api/industry_relation_info', 'get_industry_relation_info', get_industry_relation_info, methods=['GET'])

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8009)
