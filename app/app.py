from flask import Flask , render_template, redirect, request, url_for
from handle_sso import oauth_redirect, callback  # Import OAuth routes from handle_sso.py
from buyback import buyback,buyback_submit,buyback_history

app = Flask(__name__)

# You can add other routes here if needed

@app.route('/login')
def login():
    return render_template('login.html')

# Use the imported routes from handle_sso.py
app.add_url_rule('/oauth_redirect', 'oauth_redirect', oauth_redirect, methods=['POST'])
app.add_url_rule('/callback', 'callback', callback, methods=['GET'])


# Use the imported routs from buyback.py
app.add_url_rule('/industry/buyback', 'buyback', buyback, methods=["GET","POST"])
app.add_url_rule('/industry/buyback_submit', 'buyback_submit', buyback_submit, methods=["GET","POST"])
app.add_url_rule('/industry/buyback_history', 'buyback_history', buyback_history, methods=["GET"])

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000)