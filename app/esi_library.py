import requests
import os
import psycopg2
from datetime import datetime, timedelta
import base64
from flask import session

# Database Configuration (use your database credentials)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "esi_market")
DB_USER = os.getenv("DB_USER", "sangeoul")
DB_PASS = os.getenv("DB_PASS", "Password")

SELFAPI_URL="http://host.docker.internal:8009/api/"

ESI_TOKEN_ENDPOINT = "https://login.eveonline.com/v2/oauth/authorize"
ESI_AUTHORIZATION_ENDPOINT = "https://login.eveonline.com/v2/oauth/authorize"

def connect_to_db():
    """Create a connection to the database."""
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

def refresh_access_token(character_id, service_type):
    """
    Fetches a new access token using the refresh token from the database, with client_id and client_secret
    fetched dynamically from the sso_client table. Updates the access token and refresh token in the database.
    """

    # Step 1: Fetch the client_id and client_secret from the database
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT client_id, client_secret FROM sso_client
        WHERE client_service = %s
    """, (service_type,))
    sso_result = cursor.fetchone()

    if not sso_result:
        cursor.close()
        conn.close()
        raise ValueError(f"SSO client credentials not found for service_type {service_type}")

    client_id, client_secret = sso_result

    # Generate the Authorization header value
    auth_value = f"{client_id}:{client_secret}"
    auth_header = base64.b64encode(auth_value.encode()).decode()

    # Step 2: Fetch the refresh_token from the database
    cursor.execute("""
        SELECT refresh_token FROM user_oauth
        WHERE character_id = %s AND client_service = %s
    """, (character_id, service_type))
    oauth_result = cursor.fetchone()

    if not oauth_result:
        raise ValueError(f"Refresh token not found for character_id {character_id} and service_type {service_type}")

    refresh_token = oauth_result[0]

    # Step 3: Send a request to the OAuth server to get a new access_token and refresh_token
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        # "Host": "login.eveonline.com",
        "Authorization": f"Basic {auth_header}"  # Add the base64 encoded Authorization header
    }

    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "redirect_uri": "http://localhost:8001/callback"  # Adjust to your callback URL
    }

    oauth_url = ESI_OAUTH_TOKEN_ENDPOINT

    # Sending the POST request to the OAuth server
    response = requests.post(oauth_url, headers=headers, data=data)

    if response.status_code == 200:
        token_data = response.json()

        # Step 4: Get new access_token and refresh_token from the response
        new_access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token")

        # Step 5: Update the user_oauth table with the new tokens and current timestamp
        cursor.execute("""
            UPDATE user_oauth
            SET access_token = %s, refresh_token = %s, updated = %s
            WHERE character_id = %s AND client_service = %s
        """, (new_access_token, new_refresh_token, datetime.now(), character_id, service_type))
        conn.commit()
        cursor.close()
        conn.close()

        return new_access_token, new_refresh_token
    else:
        # Log response for debugging
        cursor.close()
        conn.close()
        print(f"Response Text: {response.text}")
        raise Exception(f"Error refreshing token: {response.status_code}, {response.text}")

def is_logged_in():
    if 'login_character_id' in session:
        return session['login_character_id']
    else:
        return False
    
def login(_cid):
    session['login_character_id']=_cid
    print(f"User {get_character}({}) logged in.")
    return 0

def logip():
    


def get_character_from_access_token(access_token):
    """
    This function takes an access_token and sends a GET request to the EVE Online OAuth server
    to verify the token and get the character ID.

    :param access_token: The access token as a string
    :return: The CharacterID if successful, raises an exception otherwise
    """
    url = "https://login.eveonline.com/oauth/verify"
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }


    # Sending the GET request to the OAuth verify endpoint
    response = requests.get(url, headers=headers)

    """
    Example:
    {
    "CharacterID":95465499,
    "CharacterName":"CCP Bartender",
    "ExpiresOn":"2017-07-05T14:34:16.5857101",
    "Scopes":"esi-characters.read_standings.v1",
    "TokenType":"Character",
    "CharacterOwnerHash":"lots_of_letters_and_numbers",
    "IntellectualProperty":"EVE"
    }
    """

    if response.status_code == 200:
        # Parse the response JSONac
        data = response.json()
        
        # Extract and return the CharacterID
        return data
    
    else:
        raise Exception(f"Error verifying access token: {response.status_code}, {response.text}")



def get_access_token(character_id, service_type):
    """
    This function fetches the access_token from the user_oauth table for the given character_id and service_type.
    If the 'updated' timestamp is more than 15 minutes old, it will refresh the access token using refresh_access_token.

    :param character_id: The character ID (bigint)
    :param service_type: The service type (string) for which the access token is required
    :return: The access_token if found (updated if necessary), raises an exception otherwise
    """
    
    # Step 1: Connect to the database
    conn = connect_to_db()
    cursor = conn.cursor()
    
    # Step 2: Fetch the access_token and updated timestamp from the user_oauth table
    cursor.execute("""
        SELECT access_token, updated FROM user_oauth
        WHERE character_id = %s AND client_service = %s
    """, (character_id, service_type))
    
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    # Step 3: Handle the case where the access_token is not found
    if not result:
        raise ValueError(f"Access token not found for character_id {character_id} and service_type {service_type}")
    
    access_token, updated = result
    
    # Step 4: Check if the 'updated' timestamp is older than 15 minutes
    if datetime.now() - updated > timedelta(minutes=15):
        # If the access token is older than 15 minutes, refresh the token
        print("Refreshing access token due to time expiration.")
        # Call the refresh_access_token function to update the access token
        try:
            new_access_token, _ = refresh_access_token(character_id, service_type)
        except Exception as e:
            raise Exception(f"Error refreshing token: {e}")

        return new_access_token
    else:
        # If the access token is still valid, return it
        return access_token
    
def get_charactername_by_characterid(character_id):
    conn = connect_to_db()
    cursor = conn.cursor()

    cursor.execute("SELECT character_name FROM type_info WHERE type_id = %s", (type_id,))
    type_info = cursor.fetchone()

    if type_info:
        # Return the type_id from the database
        cursor.close()
        conn.close()
        return type_info[0]

    # If not found in the database, query the external API
    endpoint = f"{SELFAPI_URL}?type_id={type_id}"
    response = requests.get(endpoint)

    if response.status_code == 200:
        # Parse the API response and extract type_id
        api_data = response.json()
        if language == 'ko':
            return api_data.get('name_ko')  # Return the Korean name
        else:
            return api_data.get('name_en')  # Return the English name as default.
    else:
        # Handle API errors
        raise ValueError(f"Error fetching data from API: {response.status_code} - {response.text}")

def update_user_info(character_id,main_id=0):
    # API endpoint for character information
    character_url = f"https://esi.evetech.net/latest/characters/{character_id}/?datasource=tranquility"
    
    # Send a GET request to the API for character information
    character_response = requests.get(character_url)
    
    # Parse the JSON response
    character_data = character_response.json()

    # Extract the necessary information from character data
    character_name = character_data.get('name')
    corp_id = character_data.get('corporation_id')
    alliance_id = character_data.get('alliance_id', None)
    birthday = datetime.strptime(character_data.get('birthday'), "%Y-%m-%dT%H:%M:%SZ").date()

    # Initialize variables for corp_ticker and alliance_ticker
    corp_ticker = None
    alliance_ticker = None
    
    # API endpoint for corporation information
    if corp_id:
        corp_url = f"https://esi.evetech.net/latest/corporations/{corp_id}/?datasource=tranquility"
        corp_response = requests.get(corp_url)
        corp_data = corp_response.json()
        corp_ticker = corp_data.get('ticker')

    # API endpoint for alliance information (if alliance_id is provided)
    if alliance_id:
        alliance_url = f"https://esi.evetech.net/latest/alliances/{alliance_id}/?datasource=tranquility"
        alliance_response = requests.get(alliance_url)
        alliance_data = alliance_response.json()
        alliance_ticker = alliance_data.get('ticker')

    if main_id==0:
        main_name=""
    else:
        main_name=get_charactername_by_characterid(main_id)

    # Connect to PostgreSQL database
    conn = connect_to_db()
    cur = conn.cursor()
    
    # Insert or update the user information in the database
    query = """
    INSERT INTO user_info (character_id, character_name, main_id, main_name, corp_id, corp_ticker, alliance_id, alliance_ticker, birthday)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (character_id) 
    DO UPDATE SET character_name = EXCLUDED.character_name, main_id = EXCLUDED.main_id, main_name = EXCLUDED.main_name, corp_id = EXCLUDED.corp_id, corp_ticker = EXCLUDED.corp_ticker, alliance_id = EXCLUDED.alliance_id, alliance_ticker = EXCLUDED.alliance_ticker, birthday = EXCLUDED.birthday, last_login_ip = EXCLUDED.last_login_ip;
    """
    values = (character_id, character_name, main_id, main_name, corp_id, corp_ticker, alliance_id, alliance_ticker, birthday)
    
    cur.execute(query, values)
    conn.commit()
    conn.close()
