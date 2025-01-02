from flask import Flask , render_template, redirect, request, url_for
from handle_sso import oauth_redirect, callback  # Import OAuth routes from handle_sso.py
from iteminfo import get_type_info
from jitaprice import get_prices
app = Flask(__name__)


# Use the imported routes from handle_sso.py
app.add_url_rule('/api/iteminfo', 'iteminfo', get_type_info, methods=['GET'])
app.add_url_rule('/api/jitaprice', 'jitaprice', get_prices, methods=['GET'])

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8009)
