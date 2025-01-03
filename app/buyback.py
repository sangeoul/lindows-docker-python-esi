from collections import namedtuple
import os
import psycopg2
import math
import json
from flask import Flask,jsonify, render_template,redirect, request
from esi_library import connect_to_db, get_access_token
from industry_library import get_typeid_by_itemname, get_icon_by_typeid, get_sell_buy,get_itemname_by_typeid,get_groupid_by_typeid

# Define the main structure for Buyback Items

"""
Old code

Buyback_Item_namedtuple = namedtuple("Buyback_Item", [
    "valid",           # bool: Is this item available for buyback or not.
    "input_id",        # int: Type ID of the input item
    "input_name",      # str: Name of the input item
    "input_amount",    # int: Amount of the input item
    "input_icon",      # str: Icon URL (updated to store URL instead of just icon ID)
    "input_buyprice",  # float: Buy price from the market
    "input_sellprice", # float: Sell price from the market
    "outputs"          # list: List of output items
])

# Define the structure for output items
Output_Item_namedtuple = namedtuple("Output_Item", [
    "output_id",       # int: Type ID of the output item
    "output_name",     # str: Name of the output item
    "output_amount",   # float: Amount of the output item derived from industry_relation
    "output_icon",     # str: Icon URL for the output item
    "output_buyprice", # float: Buy price of the output item
    "output_sellprice",# float: Sell price of the output item
    "output_price"     # float: Calculated price based on the conversion rate and quantity
])

"""

class Buyback_Item:
    def __init__(self, valid, input_id, input_name, input_amount, input_icon, input_buyprice, input_sellprice, outputs):
        self.valid = valid
        self.input_id = input_id
        self.input_name = input_name
        self.input_amount = input_amount
        self.input_icon = input_icon
        self.input_buyprice = input_buyprice
        self.input_sellprice = input_sellprice
        self.outputs = outputs

class Output_Item:
    def __init__(self, output_id, output_name, output_amount, output_icon, output_buyprice, output_sellprice, output_price):
        self.output_id = output_id
        self.output_name = output_name
        self.output_amount = output_amount
        self.output_icon = output_icon
        self.output_buyprice = output_buyprice
        self.output_sellprice = output_sellprice
        self.output_price = output_price


# Assume buyback rate as 0.9 temporarily for all outputs

MINIMUM_BUYBACK_RATE = 0.8
DEFAULT_BUYBACK_RATE = 0.9
MAX_BUYBACK_RATE = 0.97

COMPARE_TOLERANCE=0.01

# Assume refining rate as 0.6 temporarily for all outputs


def get_stock_info(type_id):
    conn = connect_to_db()
    cursor = conn.cursor()
    
    query = """
    SELECT amount, median_amount, max_amount
    FROM industry_stock
    WHERE type_id = %s
    """
    cursor.execute(query, (type_id,))
    result = cursor.fetchone()

    cursor.close()
    conn.close()

    if result:
        return result  # Return current_stock_amount, median_amount, and max_amount
    else:
        # Return default values if no data is found
        return (0, 0, 0)  # amount=0, median_amount=0, max_amount=0

def create_buyback_item(input_name, input_amount, language):
    try:
        # Fetch type_id using the library function
        validitem = True
        try:
            input_id = get_typeid_by_itemname(input_name, language)
            group_id = get_groupid_by_typeid(input_id)
        except:
            input_id = 0
            group_id = 0
            validitem = False

        # Load the whitelist from the JSON file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        whitelist_path = os.path.join(base_dir, 'static', 'buyback_whitelist.json')
        with open(whitelist_path, 'r') as file:
            whitelist = json.load(file)
        
        # Check if the input_id or group_id is in the whitelist
        validitem = any(group["id"] == group_id for group in whitelist["group_id"]) or any(item["id"] == input_id for item in whitelist["type_id"])
        
        # Query to get buy and sell prices using get_sell_buy function
        input_sellprice, input_buyprice = get_sell_buy(input_id)
        
        # Get the icon for the input item using type_id
        input_icon = get_icon_by_typeid(input_id)  # Assuming this function exists
        
        # Create a Buyback_Item structure
        item = Buyback_Item(
            valid=validitem,
            input_id=input_id,
            input_name=input_name,
            input_amount=input_amount,
            input_icon=input_icon,  # Now we store the icon URL
            input_buyprice=input_buyprice,
            input_sellprice=input_sellprice,
            outputs=[]
        )
        
        # Populate outputs
        conn = connect_to_db()
        cursor = conn.cursor()

        cursor.execute(""" 
            SELECT output_id, output_amount, input_amount 
            FROM industry_relation 
            WHERE input_id = %s AND industry_type = 1 
        """, (input_id,))
        rows = cursor.fetchall()

        if not rows:  # If no records are found, create the output with the same details as input
            # Calculate the output price based on input amount and dynamic buyback rate
            stock_data = get_stock_info(input_id)
            dynamic_buyback_rate = calculate_weighted_buyback_rate(input_amount, stock_data[0], stock_data[1], stock_data[2], input_buyprice, input_sellprice)
            output_price = math.floor(input_amount) * input_buyprice * dynamic_buyback_rate

            # Add the output item which is the same as input item
            item.outputs.append(Output_Item(
                output_id=input_id,
                output_name=input_name,
                output_amount=input_amount,
                output_icon=input_icon,
                output_buyprice=input_buyprice,
                output_sellprice=input_sellprice,
                output_price=output_price  # Same dynamic buyback logic for the output
            ))
        else:
            # Process the outputs from the industry_relation table
            for row in rows:
                output_id, output_amount, required_input_amount = row
                possible_conversions = input_amount // required_input_amount

                # Calculate the resulting output amount by considering refining rate
                total_output_amount = possible_conversions * output_amount * get_refining_rate_for_item(group_id)

                # Get output icon using type_id
                output_icon = get_icon_by_typeid(output_id)

                # Fetch output prices using get_sell_buy function
                output_sellprice, output_buyprice = get_sell_buy(output_id)

                stock_data = get_stock_info(output_id)  # Current stock amount, median_amount, max_amount

                dynamic_buyback_rate = calculate_weighted_buyback_rate(output_amount, stock_data[0], stock_data[1], stock_data[2], output_buyprice, output_sellprice)
                
                # Calculate output price
                output_price = math.floor(total_output_amount) * output_buyprice * dynamic_buyback_rate

                # Add the output to the item's output list
                item.outputs.append(Output_Item(
                    output_id=output_id,
                    output_name=get_itemname_by_typeid(output_id),  # You can fetch this if needed
                    output_amount=total_output_amount,
                    output_icon=output_icon,
                    output_buyprice=output_buyprice,
                    output_sellprice=output_sellprice,
                    output_price=output_price  # Example pricing logic with floor and buyback rate
                ))

        cursor.close()
        conn.close()

        # Calculate the sum of all output prices
        #if sum(output.output_price for output in item.outputs) == 0:
        #    item.valid = False
    
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return None

    return item



def buyback():
    if request.method == "POST":
        
        data = request.get_json()
        
        input_items = data.get("input_items")
        language = data.get("language")
        
        # Parse the input items into a dictionary to aggregate item amounts
        lines = input_items.splitlines()
        parsed_items = {}
        for line in lines:
            try:
                parts = line.split("\t")  # Split by tab
                
                if len(parts) < 2:
                    continue  # Skip invalid lines with fewer than 2 parts
                
                item_name = parts[0].strip()  # First part is the item name
                parts[1] = parts[1].replace(",", "").strip()
                if parts[1] == "":
                    item_amount = 1
                else:
                    item_amount = int(parts[1])  # Second part is the amount, clean commas and convert to integer

                if item_name in parsed_items:
                    parsed_items[item_name] += item_amount  # Aggregate the amount if item already exists
                else:
                    parsed_items[item_name] = item_amount  # Add new item to dictionary

            except (IndexError, ValueError) as e:
                print(f"Error parsing line: {line} - {e}")
                continue
        
        # Convert the parsed_items dictionary to a list of dictionaries
        item_list = [{'input_name': name, 'input_amount': amount} for name, amount in parsed_items.items()]
        
        # Call the calculate function with parsed items and language
        results, icons, output_results = buyback_calculate(item_list, language)
        
        # Determine validity
        valid = all(result.get('valid', False) for result in results.values())
        
        # Return JSON response
        return jsonify({
            'valid': valid,
            'results': results,
            'icons': icons,
            'output_results': output_results
        })

    return render_template("buyback.html", results=None)


def buyback_calculate(parsed_items, language='en'):
    """
    Perform calculations for buyback based on parsed input items.
    Returns results, icons, and output_results.
    """
    
    results = {}
    icons = {}
    output_results = []

    for item_data in parsed_items:
        input_name = item_data['input_name']
        input_amount = item_data['input_amount']
        
        # Create the buyback item using the helper function
        item = create_buyback_item(input_name, input_amount, language)
        
        if item is None:
            # Mark the item as invalid in the results
            results[input_name] = {'valid': False}
            continue
        
        # Calculate total price from all outputs
        input_price = sum(output.output_price for output in item.outputs)
        
        results[input_name] = {
            'valid': item.valid,
            'input_id': item.input_id,
            'input_price': input_price,
            'input_amount': item.input_amount,
            'input_buyprice': item.input_buyprice,
        }
        icons[input_name] = item.input_icon
        
        # Add output items to output_results or update existing ones
        for output in item.outputs:
            existing_output = next((o for o in output_results if o['output_id'] == output.output_id), None)
            if existing_output:
                existing_output['output_amount'] += output.output_amount
                existing_output['output_price'] += output.output_price
            else:
                output_results.append({
                    'output_id': output.output_id,
                    'output_name': output.output_name,
                    'output_amount': output.output_amount,
                    'output_price': output.output_price,
                    'output_icon': output.output_icon,
                    'output_buyprice': output.output_buyprice,
                })

    return results, icons, output_results


def buyback_submit():
    # Step 1: Extract the form data (input_items, output_items, and language)
    language = request.form.get('language', 'en')  # Default to 'en' if not provided
    
    # Step 2: Initialize empty lists to store input_items and output_items
    input_items = []
    output_items = []

    # Step 3: Dynamically extract input_items
    index = 0
    while f'input_items[{index}]' in request.form:
        item_data = request.form.get(f'input_items[{index}]')  # Get the JSON string for input item
        if item_data:
            input_items.append(json.loads(item_data))  # Parse the JSON string to a dictionary
        index += 1
    
    # Step 4: Dynamically extract output_items
    index = 0
    while f'output_items[{index}]' in request.form:
        item_data = request.form.get(f'output_items[{index}]')  # Get the JSON string for output item
        if item_data:
            output_items.append(json.loads(item_data))  # Parse the JSON string to a dictionary
        index += 1

       
    if not input_items or not output_items:
        # Return a simple error page if input or output items are missing
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Buyback Error</title>
        </head>
        <body>
            <h1>Error: Invalid data. Input or Output items missing.</h1>
            <p>Please check your input or output data and try again.</p>
            <a href="/buyback">Go back to Buyback page</a>
        </body>
        </html>
        """
    
    # Step 2: Transform input_items to suit the format of buyback_calculate
    parsed_items = []
    
    # Transform input_items into the format expected by buyback_calculate
    for input in input_items:
        parsed_items.append({
            'input_name': input['item_name'],
            'input_amount': input['amount']
        })

    # Step 3: Call buyback_calculate with the formatted data
    results, icons, output_results = buyback_calculate(parsed_items, language)
    
    # Step 4: Compare results
    if compare_results(input_items, output_items, results, output_results):
        try:
            # Step 4.1: Connect to the PostgreSQL database using psycopg2
            
            conn = connect_to_db()
            cursor = conn.cursor()
            
            # Step 4.2: Get the highest contract_id from the database and increment by 1
            cursor.execute("SELECT MAX(contract_id) FROM buyback_contract_log")
            max_contract_id = cursor.fetchone()[0] or 0
            new_contract_id = max_contract_id + 1
            
            # Step 4.3: Insert each input item into the database
            for input in input_items:
                # Get type_id by item_name (you need to implement the get_typeid_by_itemname function)
                
                type_id = get_typeid_by_itemname(input['item_name'])
                
                total_price = input['total_price']
                amount = input['amount']
                buyprice = input['buyprice']
                price_rate = (total_price / amount) / buyprice if amount and buyprice else 0
                
                # Insert the record into the database
                cursor.execute("""
                    INSERT INTO buyback_contract_log (contract_id, charcater_id, character_name, type_id, name_en, amount, buyprice, total_price, price_rate, is_input)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_contract_id,
                    0,  # Default value for charcater_id
                    "",  # Default empty character_name
                    type_id,
                    input['item_name'],
                    amount,
                    buyprice,
                    total_price,
                    price_rate,
                    True  # Input item
                ))
                
            # Step 4.4: Insert each output item into the database
            for output in output_items:
                # Get type_id by item_name (you need to implement the get_typeid_by_itemname function)
                type_id = get_typeid_by_itemname(output['item_name'])
                
                total_price = output['total_price']
                amount = output['amount']
                buyprice = output['buyprice']
                price_rate = (total_price / amount) / buyprice if amount and buyprice else 0
                
                # Insert the record into the database
                cursor.execute("""
                    INSERT INTO buyback_contract_log (contract_id, charcater_id, character_name, type_id, name_en, amount, buyprice, total_price, price_rate, is_input)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_contract_id,
                    0,  # Default value for charcater_id
                    "",  # Default empty character_name
                    type_id,
                    output['item_name'],
                    amount,
                    buyprice,
                    total_price,
                    price_rate,
                    False  # Output item
                ))

            
            
            # Step 4.5: Commit the transaction and close the connection
            conn.commit()
            cursor.close()
            conn.close()

            # Step 5: Render success page inline
            return f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Buyback Success</title>
            </head>
            <body>
                <h1>Success: Buyback contract created successfully!</h1>
                <p>Your buyback number is <h2>{new_contract_id}</h2></p>
                <a href="/industry/buyback-history?contract_number={new_contract_id}">Go to Check Buyback</a>
            </body>
            </html>
            """
        
        except (psycopg2.DatabaseError, psycopg2.Error) as e:
            # If there was an error with the database, roll back the transaction
            if conn:
                conn.rollback()
            
            # Log the error (optional)
            print(f"Database error occurred: {e}")
            
            # Render the error page
            return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Buyback Error</title>
            </head>
            <body>
                <h1>Error: A database error occurred while processing your buyback contract.</h1>
                <p>There was an issue saving your contract details. Please try again later.</p>
                <a href="/buyback">Go back to Buyback page</a>
            </body>
            </html>
            """
        
        except Exception as e:
            # Catch any other exceptions and display a generic error message
            print(f"Unexpected error: {e}")
            return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Buyback Error</title>
            </head>
            <body>
                <h1>Error: An unexpected error occurred.</h1>
                <p>Something went wrong while processing your request. Please try again later.</p>
                <a href="/buyback">Go back to Buyback page</a>
            </body>
            </html>
            """
    
    else:
        # If the comparison failed, render error page inline
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Buyback Error</title>
        </head>
        <body>
            <h1>Error: Price mismatch detected.</h1>
            <p>There was an issue with the prices. Please check the buyback values and try again.</p>
            <a href="/buyback">Go back to Buyback page</a>
        </body>
        </html>
        """

def buyback_history():
    contract_number = request.args.get('contract_number')  # Get contract number from URL
    
    if contract_number:
        data = get_buyback_history(contract_number)
    else:
        data = {"input_results": [], "output_results": []}
    
    return render_template('buyback_history.html', contract_number=contract_number, data=data)


def get_buyback_history(contract_number):
    conn = connect_to_db()
    cursor = conn.cursor()
    
    # Query to get input and output records based on the contract_number
    query = """
    SELECT contract_id, character_name, type_id, name_en, amount, buyprice, total_price, price_rate, is_input
    FROM buyback_contract_log
    WHERE contract_id = %s
    ORDER BY registered_timestamp;
    """
    
    cursor.execute(query, (contract_number,))
    result = cursor.fetchall()
    
    input_data = []
    output_data = []
    
    for row in result:
        contract_id, character_name, type_id, name_en, amount, buyprice, total_price, price_rate, is_input = row
        icon_url = get_icon_by_typeid(type_id)  # Fetching icon URL for each item
        data = {
            "character_name": character_name,
            "type_id": type_id,
            "name_en": name_en,
            "amount": amount,
            "buyprice": buyprice,
            "total_price": total_price,
            "price_rate": price_rate,
            "icon_url": icon_url
        }
        if is_input:
            input_data.append(data)
        else:
            output_data.append(data)
    
    cursor.close()
    conn.close()

    return {"input_results": input_data, "output_results": output_data}



def compare_results(input_items, output_items, results, output_results, tolerance=COMPARE_TOLERANCE):
    """
    Compare the original input and output items with the results from buyback_calculate and output results.
    If any item has a discrepancy greater than the allowed tolerance, return False. Otherwise, return True.
    """
    # Function to check if the price difference is within the tolerance (0.5%)
    def is_within_tolerance(expected_price, calculated_price, tolerance):
        if expected_price>0:
            return abs(expected_price - calculated_price) / expected_price <= tolerance
        else:
            return 0

    # Check input items
    for input in input_items:
        input_name = input['item_name']
        expected_input_total_price = input['total_price']  # Expected price from frontend

        if input_name in results:
            calculated_input_price = results[input_name]['input_price']
            
            # Check if the difference is within tolerance
            if not is_within_tolerance(expected_input_total_price, calculated_input_price, tolerance):
                
                return False
        else:
            # If the item is missing in the results, it fails the comparison
            
            return False

    # Check output items
    for output in output_items:
        output_name = output['item_name']
        
        expected_output_total_price = output['total_price']  # Expected price from frontend
        
        # Find the corresponding output in the calculated results
        matching_output = next((o for o in output_results if o['output_name'] == output_name), None)

        if matching_output:
            calculated_output_price = matching_output['output_price']
            
            # Check if the difference is within tolerance
            if not is_within_tolerance(expected_output_total_price, calculated_output_price, tolerance):
                
                return False
        else:
            # If the item is missing in the output results, it fails the comparison
            
            return False

    # If all checks pass, return True
    return True


def get_refining_rate_for_item(group_id):

    # Load refining rates from the JSON file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    refining_rate_path = os.path.join(base_dir, 'static', 'refining_rates.json')
    with open(refining_rate_path, 'r') as file:
        refining_data = json.load(file)

    # Loop through the groups to find the group that contains the item
    for group in refining_data['groups']:
        # Check each item in the group's item list
        if group['id'] == group_id:
            return group['refining_rate']
    
    # Return None if the item is not found
    return 0.55


def calculate_simple_buyback_rate(current_stock_amount,median_amount,max_amount, buyprice, sellprice):

    modified_max_buyback_rate = (MAX_BUYBACK_RATE * sellprice) / buyprice

    if current_stock_amount>=max_amount:
        return MINIMUM_BUYBACK_RATE
    elif current_stock_amount>=median_amount:
        return DEFAULT_BUYBACK_RATE - (DEFAULT_BUYBACK_RATE - MINIMUM_BUYBACK_RATE)*(current_stock_amount-median_amount)/(max_amount-median_amount)
    elif current_stock_amount<=median_amount:
        return modified_max_buyback_rate - (modified_max_buyback_rate - DEFAULT_BUYBACK_RATE)*(current_stock_amount/median_amount)


def calculate_weighted_buyback_rate(output_amount, current_stock_amount, median_amount, max_amount, buyprice, sellprice):
    """
    Calculate the weighted average buyback rate based on the output amount and the current stock.

    Args:
        output_amount (int): Amount the user wants to sell.
        current_stock_amount (int): Current stock amount of the item.
        median_amount (int): Median stock amount from the database.
        max_amount (int): Maximum stock amount from the database.
        sellprice (float): Sell price of the item.
        buyprice (float): Buy price of the item.

    Returns:
        float: The weighted average buyback rate.
    """
    if median_amount == 0:
        # If no valid stock information is available (i.e., median_amount is 0), return the default buyback rate.
        return DEFAULT_BUYBACK_RATE

    if current_stock_amount >= max_amount:
        # If the current stock amount exceeds max_amount, return the minimum buyback rate.
        return MINIMUM_BUYBACK_RATE

    # Calculate modified max buyback rate for the first segment.
    modified_max_buyback_rate = (MAX_BUYBACK_RATE * sellprice) / buyprice


    if current_stock_amount+output_amount <= median_amount:
        # If stock is less than or equal to median, we use a linear transition from DEFAULT to modified_max.
        total_rate = calculate_simple_buyback_rate(current_stock_amount,median_amount,max_amount, sellprice, buyprice)\
                    + calculate_simple_buyback_rate(current_stock_amount+output_amount,median_amount,max_amount, sellprice, buyprice)
        return total_rate/2

    elif current_stock_amount+output_amount >= median_amount\
    and current_stock_amount>=median_amount\
    and current_stock_amount+output_amount<=max_amount :
        total_rate = calculate_simple_buyback_rate(current_stock_amount,median_amount,max_amount, sellprice, buyprice)\
                    + calculate_simple_buyback_rate(current_stock_amount+output_amount,median_amount,max_amount, sellprice, buyprice)
        return total_rate/2
    
    elif current_stock_amount<=median_amount:
        if current_stock_amount+output_amount<=max_amount:
            weighted_rate = (calculate_simple_buyback_rate(current_stock_amount,median_amount,max_amount, sellprice, buyprice) + DEFAULT_BUYBACK_RATE)\
                *(median_amount-current_stock_amount)\
                \
                +(DEFAULT_BUYBACK_RATE + calculate_simple_buyback_rate(current_stock_amount+output_amount,median_amount,max_amount, sellprice, buyprice))\
                *(current_stock_amount+output_amount-median_amount)\

        else:
                weighted_rate = (calculate_simple_buyback_rate(current_stock_amount,median_amount,max_amount, sellprice, buyprice) + DEFAULT_BUYBACK_RATE)\
                *(median_amount-current_stock_amount)\
                \
                +(DEFAULT_BUYBACK_RATE + MINIMUM_BUYBACK_RATE)*(max_amount-median_amount)
                \
                +MINIMUM_BUYBACK_RATE*2*(current_stock_amount+output_amount-max_amount)\
                
    else:
        weighted_rate = (calculate_simple_buyback_rate(current_stock_amount,median_amount,max_amount, sellprice, buyprice) + MINIMUM_BUYBACK_RATE)\
            *(max_amount-current_stock_amount)\
            \
            +MINIMUM_BUYBACK_RATE*2*(current_stock_amount+output_amount-max_amount)\

    return weighted_rate/(2*output_amount)