import os
from flask import Flask , render_template, redirect, url_for, session
from flask_talisman import Talisman
from datetime import timedelta
from handle_sso import oauth_redirect, callback  # Import OAuth routes from handle_sso.py
from buyback import buyback,buyback_submit,buyback_history,accept_buyback,show_contracts_list,buyback_notice

from industry_tools import register_industry, input_item_to_DB, stock_update

app = Flask(__name__)

# Define your CSP policy
csp = {
    'default-src': "'self'",
    'img-src': ["'self'", "https://images.evetech.net"]
}
# Apply Talisman with the CSP policy
Talisman(app,content_security_policy=csp)

app.secret_key = os.environ.get('SECRET_KEY')


# Session time setting.
app.config['SESSION_PERMANENT'] = True 
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365)

# You can add other routes here if needed

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/logout')
def logout():
    session['login_character_id']=0

    return redirect(url_for('login'))

# Use the imported routes from handle_sso.py
app.add_url_rule('/oauth_redirect', 'oauth_redirect', oauth_redirect, methods=['POST'])
app.add_url_rule('/callback', 'callback', callback, methods=['GET'])


# Use the imported routs from buyback.py
app.add_url_rule('/industry/buyback', 'buyback', buyback, methods=["GET","POST"])
app.add_url_rule('/industry/buyback_submit', 'buyback_submit', buyback_submit, methods=["GET","POST"])
app.add_url_rule('/industry/buyback_history', 'buyback_history', buyback_history, methods=["GET"])
app.add_url_rule('/industry/accept_buyback', 'accept_buyback', accept_buyback, methods=["GET"])
app.add_url_rule('/industry/buyback_list', 'buyback_list', show_contracts_list, methods=["GET"])
app.add_url_rule('/industry/buyback_notice', 'buyback_notice', buyback_notice, methods=["GET"])


app.add_url_rule('/register_industry', 'register_industry', register_industry, methods=["GET", "POST"])
app.add_url_rule('/input_items', 'input_item_to_DB', input_item_to_DB, methods=["GET", "POST"])
app.add_url_rule('/stock_update', 'stock_update', stock_update,methods=["GET", "POST"])

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8001)
