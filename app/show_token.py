from flask import render_template,make_response,request
from esi_library import get_access_token,get_charactername_by_characterid,connect_to_db,is_logged_in

def show_manufacturing_token():

    character_id=is_logged_in()
    if character_id:
        refresh_token_requested = request.args.get("refresh_token_requested")

        character_name=get_charactername_by_characterid(character_id)
        if refresh_token_requested!=1:
            refresh_token_requested=0

        try:
            access_token=get_access_token(character_id, "manufacturing",True)
        except:
            access_token=None


        if refresh_token_requested==1:
            conn = connect_to_db()
            cursor = conn.cursor()
            
            # Step 2: Fetch the access_token and updated timestamp from the user_oauth table
            cursor.execute("""
                SELECT refresh_token FROM user_oauth
                WHERE character_id = %s AND client_service = "manufacturing"
            """, (character_id, ))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()

            if result :
                refresh_token = result[0]
            else:
                refresh_token=None
        else:
            refresh_token=None
    else:
        character_name=None
        access_token=None
        refresh_token=None
        
    # Create a response object
    
    return render_template('manufacturing_token.html', access_token=access_token, refresh_token=refresh_token,character_name=character_name)  
