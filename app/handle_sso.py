import os
import requests
import base64
import json 
from flask import redirect,render_template, session, request 
import psycopg2
from urllib.parse import quote
from esi_library import get_character_from_access_token,connect_to_db,update_user_info,login,logip,ESI_TOKEN_ENDPOINT,ESI_AUTHORIZATION_ENDPOINT

#app = Flask(__name__)

ESI_CALLBACK_URI = "https://lindows.kr:8001/callback"

#@app.route('/oauth_redirect', methods=['POST'])
def oauth_redirect():

    # Get the selected client index from the form
    client_service = request.form['client_select']
    
    # Connect to the database and fetch client details
    try:
        with connect_to_db() as dbconn: 
            with dbconn.cursor() as cursor:
                cursor.execute(
                    "SELECT client_id, client_secret, client_service, scope FROM sso_client WHERE client_service = %s", 
                    (client_service,)
                )
                client = cursor.fetchone()
            dbconn.commit()
    except Exception as e:
        print(f"Error occured: {e}")
        client=None  # Ensure client is always initialized

    if client:
        # Extract client details from the database
        client_id, client_secret, client_type,client_scope_string = client[0], client[1], client[2],client[3]  # Adjust according to your schema

        client_scope=" ".join(json.loads(client_scope_string))
        # Define the common parameters for the OAuth URL
        redirect_uri = ESI_CALLBACK_URI  # Replace with your actual callback URL

        # Build the OAuth2 authorization URL
        oauth_url = f"{ESI_AUTHORIZATION_ENDPOINT}/?response_type=code&redirect_uri={quote(redirect_uri)}&client_id={quote(client_id)}&scope={quote(client_scope)}&state={client_type}"
        
        print(f"!!!DEBUG : {oauth_url}",flush=True)
        # Redirect the user to the OAuth provider
        return redirect(oauth_url)
    else:
        return "Client not found", 404


def callback():
    # Capture the authorization code and state
    code = request.args.get('code')
    state = request.args.get('state')

    if not code:
        return "Error: No code found in callback", 400

    # Connect to the database and fetch the client details based on state
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT client_id, client_secret FROM sso_client WHERE client_service = %s", (state,))
    client = cursor.fetchone()
    cursor.close()
    conn.close()

    if not client:
        return "Error: Client not found for state", 404

    # Extract the client_id and client_secret
    client_id, client_secret = client

    # Create the "Authorization: Basic" header by encoding client_id:client_secret in Base64
    auth_value = f"{client_id}:{client_secret}"
    auth_header = base64.b64encode(auth_value.encode()).decode()

    # Prepare the POST data for the token exchange request
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': ESI_CALLBACK_URI,  # Same callback URI used during the OAuth flow
    }

    # Prepare the HTTP headers
    headers = {
        'Authorization': f"Basic {auth_header}",
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'login.eveonline.com',
    }

    # Log the request details for debugging
    print(f"Sending POST request to {ESI_TOKEN_ENDPOINT}")
    print(f"Headers: {headers}")
    print(f"Data: {data}")

    # Send a POST request to get the access token
    token_url = ESI_TOKEN_ENDPOINT
    response = requests.post(token_url, data=data, headers=headers)

    # Log the response for debugging
    print(f"Response status code: {response.status_code}")
    print(f"Response text: {response.text}")

    if response.status_code == 200:
        # Successfully received the access token
        token_data = response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        try:
            # Insert or update the tokens in the database
            with connect_to_db() as dbconn: 
                with dbconn.cursor() as cursor:
                    character_information = get_character_from_access_token(access_token)
                    character_id = character_information.get("CharacterID")

                    insert_query = """
                        INSERT INTO user_oauth (character_id, client_service, access_token, refresh_token)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (character_id, client_service) 
                        DO UPDATE 
                        SET access_token = EXCLUDED.access_token, 
                            refresh_token = EXCLUDED.refresh_token, 
                            updated = CURRENT_TIMESTAMP;
                        """
                    cursor.execute(insert_query, (character_id, state, access_token, refresh_token))
                    update_user_info(character_id)
                dbconn.commit()
                login(character_id)

            return f"Tokens saved successfully for {character_id} with client service {state}"

        except Exception as e:
            print(f"Error saving tokens to the database: {e}",flush=True)
            return "Error saving tokens", 500
    
    else:
        try:
            error_details = response.json()
            print("Error Details:", error_details)
            errormessage = error_details
        except ValueError:
            # If response is not in JSON format
            print("Error Details:", response.text)
            errormessage = response.text
        return f"Error during token exchange ({response.status_code}): {errormessage}", 403


def getTokenRedirect():

    # Get the selected client index from the form
    client_id = request.form['client_id']
    client_secret = request.form['client_secret']
    callback_url='https://lindows.kr:8001/getTokens'
    client_scope="publicData esi-search.search_structures.v1 esi-universe.read_structures.v1 esi-assets.read_assets.v1 esi-industry.read_character_jobs.v1 esi-assets.read_corporation_assets.v1 esi-industry.read_corporation_jobs.v1 esi-industry.read_character_mining.v1 esi-industry.read_corporation_mining.v1"
    temp_state='["'+client_id+'","'+client_secret+'"]'
    # Build the OAuth2 authorization URL
    oauth_url = f"{ESI_AUTHORIZATION_ENDPOINT}/?response_type=code&redirect_uri={quote(callback_url)}&client_id={quote(client_id)}&scope={quote(client_scope)}&state={temp_state}"
    
    print(f"!!!DEBUG : {oauth_url}",flush=True)
    # Redirect the user to the OAuth provider
    return redirect(oauth_url)

def getTokenCallback():
    # Capture the authorization code and state
    code = request.args.get('code')
    state_string = request.args.get('state')
    state=json.loads(state_string)
    # Get the selected client index from the form
    client_id = state[0]
    client_secret = state[1]
    callback_url='https://lindows.kr:8001/getTokens'
    client_scope="publicData esi-search.search_structures.v1 esi-universe.read_structures.v1 esi-assets.read_assets.v1 esi-industry.read_character_jobs.v1 esi-assets.read_corporation_assets.v1 esi-industry.read_corporation_jobs.v1 esi-industry.read_character_mining.v1 esi-industry.read_corporation_mining.v1"

    if not code:
        return "Error: No code found in callback", 400

    # Create the "Authorization: Basic" header by encoding client_id:client_secret in Base64
    auth_value = f"{client_id}:{client_secret}"
    auth_header = base64.b64encode(auth_value.encode()).decode()

    # Prepare the POST data for the token exchange request
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': callback_url,  # Same callback URI used during the OAuth flow
    }

    # Prepare the HTTP headers
    headers = {
        'Authorization': f"Basic {auth_header}",
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'login.eveonline.com',
    }

    # Log the request details for debugging
    print(f"Sending POST request to {ESI_TOKEN_ENDPOINT}")
    print(f"Headers: {headers}")
    print(f"Data: {data}")

    # Send a POST request to get the access token
    token_url = ESI_TOKEN_ENDPOINT
    response = requests.post(token_url, data=data, headers=headers)

    # Log the response for debugging
    print(f"Response status code: {response.status_code}")
    print(f"Response text: {response.text}")

    if response.status_code == 200:
        # Successfully received the access token
        token_data = response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        return render_template('manufacturing_token.html', access_token=access_token, refresh_token=refresh_token)

    else:
        try:
            error_details = response.json()
            print("Error Details:", error_details)
            errormessage = error_details
        except ValueError:
            # If response is not in JSON format
            print("Error Details:", response.text)
            errormessage = response.text
        return render_template('manufacturing_token.html', access_token=None, refresh_token=None,error=errormessage)
        
#if __name__ == '__main__':
#    app.run(debug=True)
