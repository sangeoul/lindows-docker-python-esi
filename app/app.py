import os
from flask import Flask, render_template, redirect, url_for, session, make_response
from flask_talisman import Talisman
from datetime import timedelta

from handle_sso import oauth_redirect, callback  # Import OAuth routes from handle_sso.py
from buyback import buyback, buyback_submit, buyback_history, accept_buyback, delete_buyback, show_contracts_list, buyback_notice
from industry_tools import register_industry, input_item_to_DB, stock_update
from ore_price_calculator import ore_price_calculate
from industry_calculator import industry_calculator

from show_token import show_manufacturing_token  # Import the function

app = Flask(__name__)

# Define your CSP policy
csp = {
    'default-src': "'self'",
    'img-src': ["'self'", "https://images.evetech.net", "https://lindows.kr:8009"],
    'connect-src': ["'self'", "https://esi.evetech.net", "https://lindows.kr:8009"],
    'style-src': ["'self'", "https://fonts.googleapis.com"],  # Add Google Fonts here
    'font-src': ["'self'", "https://fonts.gstatic.com"]  # Add Google Fonts source for fonts
}
# Apply Talisman with the CSP policy
talisman = Talisman(app, content_security_policy=csp)

app.secret_key = os.environ.get('SECRET_KEY')

# Session time setting
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365)

# Middleware to set Permissions-Policy header
@app.after_request
def set_permissions_policy(response):
    response.headers['Permissions-Policy'] = 'geolocation=(self), microphone=(), camera=(), fullscreen=()'
    return response

# You can add other routes here if needed

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/logout')
def logout():
    session['login_character_id'] = 0
    return redirect(url_for('login'))

# Use the imported routes from handle_sso.py
app.add_url_rule('/oauth_redirect', 'oauth_redirect', oauth_redirect, methods=['POST'])
app.add_url_rule('/callback', 'callback', callback, methods=['GET'])

# Use the imported routes from buyback.py
app.add_url_rule('/industry/buyback', 'buyback', buyback, methods=["GET", "POST"])
app.add_url_rule('/industry/buyback_submit', 'buyback_submit', buyback_submit, methods=["GET", "POST"])
app.add_url_rule('/industry/buyback_history', 'buyback_history', buyback_history, methods=["GET"])
app.add_url_rule('/industry/accept_buyback', 'accept_buyback', accept_buyback, methods=["GET"])
app.add_url_rule('/industry/delete_buyback', 'delete_buyback', delete_buyback, methods=["GET"])
app.add_url_rule('/industry/buyback_list', 'buyback_list', show_contracts_list, methods=["GET"])
app.add_url_rule('/industry/buyback_notice', 'buyback_notice', buyback_notice, methods=["GET"])
app.add_url_rule('/industry/ore_price_calculator', 'ore_price_calculator', ore_price_calculate, methods=["GET"])

app.add_url_rule('/industry/industry_calculator', 'industry_calculator', industry_calculator, methods=["GET"])

app.add_url_rule('/register_industry', 'register_industry', register_industry, methods=["GET", "POST"])
app.add_url_rule('/input_items', 'input_item_to_DB', input_item_to_DB, methods=["GET", "POST"])
app.add_url_rule('/stock_update', 'stock_update', stock_update, methods=["GET", "POST"])

# Add the route for show_manufacturing_token with dynamic CSP
@app.route('/manufacturing_token')
def manufacturing_token_route():
    # Generate the response using the function from show_token.py
    response = make_response(show_manufacturing_token())
    
    # Define CSP with unsafe-inline for this specific response
    csp_inline = {
        'default-src': "'self'",
        'img-src': ["'self'", "https://images.evetech.net", "https://lindows.kr:8009"],
        'connect-src': ["'self'", "https://esi.evetech.net", "https://lindows.kr:8009"],
        'style-src': ["'self'", "https://fonts.googleapis.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'script-src': ["'self'", "'unsafe-inline'"]  # Allow inline scripts for this route
    }
    
    # Apply the dynamic CSP to the response
    talisman.content_security_policy = csp_inline
    talisman.set_response_headers(response)
    
    return response

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8001)
