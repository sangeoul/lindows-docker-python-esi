from flask import render_template, make_response, request
from esi_library import get_access_token, get_charactername_by_characterid, connect_to_db, is_logged_in
import secrets

def show_manufacturing_token():
    character_id = is_logged_in()
    if character_id:
        request_refresh_token = request.args.get("request_refresh_token")

        if request_refresh_token:
            request_refresh_token = int(request_refresh_token)
        else:
            request_refresh_token = 0
        
        character_name = get_charactername_by_characterid(character_id)

        if request_refresh_token != 1:
            request_refresh_token = 0
        try:
            access_token = get_access_token(character_id, "manufacturing", True)
        except Exception as e:
            print("Error occurred: " + str(e))
            access_token = None

        if request_refresh_token == 1:
            conn = connect_to_db()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT refresh_token FROM user_oauth
                WHERE character_id = %s AND client_service = 'manufacturing'
            """, (character_id,))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()

            if result:
                refresh_token = result[0]
            else:
                refresh_token = None
        else:
            refresh_token = None
    else:
        character_name = None
        access_token = None
        refresh_token = None

    # Generate a nonce
    nonce = secrets.token_hex(16)

    # Create a response object
    response = make_response(render_template('manufacturing_token.html', access_token=access_token, refresh_token=refresh_token, character_name=character_name, nonce=nonce))
    
    # Define CSP with nonce for this specific response
    csp_inline = (
        "default-src 'self'; "
        "img-src 'self' https://images.evetech.net https://lindows.kr:8009; "
        "connect-src 'self' https://esi.evetech.net https://lindows.kr:8009; "
        "style-src 'self' https://fonts.googleapis.com 'nonce-{nonce}'; "
        "font-src 'self' https://fonts.gstatic.com; "
        "script-src 'self' 'nonce-{nonce}'"
    ).format(nonce=nonce)
    
    # Apply the dynamic CSP to the response
    response.headers['Content-Security-Policy'] = csp_inline
    
    return response
