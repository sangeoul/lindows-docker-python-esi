import re
import psycopg2
import os
from flask import Flask, request, render_template,render_template_string, redirect, url_for, flash
from esi_library import connect_to_db
from industry_library import get_typeid_by_itemname
import requests
from iteminfo import get_type_info


# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Required for session management and flashing messages

# Industry type constant
INDUSTRY_REPROCESSING = 1
INDUSTRY_MANUFACTURING = 2  # Manufacturing industry type


def storeToDB(records):
    """Store parsed records in the database."""
    conn = connect_to_db()
    cursor = conn.cursor()

    for record in records:
        cursor.execute("""
            INSERT INTO industry_relation (output_id, output_amount, input_id, input_amount, industry_type, recipe_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (output_id, input_id, recipe_id)
            DO UPDATE SET 
                output_amount = EXCLUDED.output_amount,
                input_amount = EXCLUDED.input_amount,
                industry_type = EXCLUDED.industry_type
        """, record)

    conn.commit()
    cursor.close()
    conn.close()

def parsingReprocessing(input_text):
    """Parse input text specific to the Reprocessing industry type."""
    lines = input_text.strip().split("\n")
    
    # Extract input information
    input_line = lines[0].strip()  # Get the first line and strip whitespace

    # Check if there is an '@' symbol in the input line
    if '@' in input_line:
        input_match = re.match(r"^(.*?)@(\d+)$", input_line)
        if not input_match:
            raise ValueError("Invalid input line format")
        
        input_name = input_match.group(1).strip()  # Name part before '@'
        input_amount = int(input_match.group(2).replace(",", ""))  # Amount part after '@'
    else:
        # If '@' is not found, assume the whole line is the name and set amount to 100
        input_name = input_line
        input_amount = 100

    # Find input_id from the database
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT type_id FROM type_info WHERE name_en = %s OR name_ko = %s", (input_name, input_name))
    input_id_row = cursor.fetchone()
    if not input_id_row:
        print(f"Input item '{input_name}' not found in the database", flush=True)
        raise ValueError(f"Input item '{input_name}' not found in the database")
    input_id = input_id_row[0]
    print(f"Input item type_id:{input_id}", flush=True)
    
    # Process output information
    records = []
    for line in lines[2:]:
        if line.strip() in ["Compression Output", "Compression Input"]:
            break  # Ignore lines after this
        output_match = re.match(r"^(.*?) \((\d+) Unit(s?)\)$", line.strip())
        if not output_match:
            continue  # Skip invalid lines
        
        output_name = output_match.group(1).strip()
        output_amount = int(output_match.group(2).replace(",", ""))
        
        # Find output_id from the database
        cursor.execute("SELECT type_id FROM type_info WHERE name_en = %s OR name_ko = %s", (output_name, output_name))
        output_id_row = cursor.fetchone()
        if not output_id_row:
            print(f"Output item '{output_name}' not found in the database", flush=True)
            raise ValueError(f"Output item '{output_name}' not found in the database")
        output_id = output_id_row[0]
        print(f"Output item type_id:{output_id}", flush=True)
        
        # Construct the record
        records.append((output_id, output_amount, input_id, input_amount, INDUSTRY_REPROCESSING, input_id))
    
    # Close the connection
    cursor.close()
    conn.close()

    return records

def parsingManufacturing(input_text):
    """Parse input text specific to the Manufacturing industry type."""
    lines = input_text.strip().split("\n")
    output_line = lines[1]
    input_lines = [line for line in lines[2:] if re.match(r"^\d+(,\d{3})* x", line)]

    # Extract output information
    output_match = re.match(r"^(\d+(,\d{3})*) x (.+)", output_line)
    if not output_match:
        raise ValueError("Invalid output line format")

    output_amount = int(output_match.group(1).replace(",", ""))
    output_name = output_match.group(3).strip().replace("\n", "").replace("\t", "")  # Clean the name

    # Find output_id from the database
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT type_id FROM type_info WHERE name_en = %s OR name_ko = %s", (output_name, output_name))
    output_id_row = cursor.fetchone()
    if not output_id_row:
        print(f"Output item '{output_name}' not found in the database", flush=True)
        raise ValueError(f"Output item '{output_name}' not found in the database")
    output_id = output_id_row[0]
    print(f"Product item type_id:{output_id}", flush=True)

    # Extract input information
    records = []
    for line in input_lines:
        input_match = re.match(r"^(\d+(,\d{3})*) x (.+)", line)
        if not input_match:
            continue  # Skip invalid lines

        input_amount = int(input_match.group(1).replace(",", ""))
        input_name = input_match.group(3).strip().replace("\n", "").replace("\t", "")  # Clean the name

        # Find input_id from the database
        cursor.execute("SELECT type_id FROM type_info WHERE name_en = %s OR name_ko = %s", (input_name, input_name))
        input_id_row = cursor.fetchone()
        if not input_id_row:
            print(f"Input item '{input_name}' not found in the database", flush=True)
            raise ValueError(f"Input item '{input_name}' not found in the database")
        input_id = input_id_row[0]
        print(f"Material item type_id:{input_id}", flush=True)

        # Construct the record
        records.append((output_id, output_amount, input_id, input_amount, INDUSTRY_MANUFACTURING, output_id))

    # Close the connection after processing
    cursor.close()
    conn.close()

    return records


@app.route("/register_industry", methods=["GET", "POST"])
def register_industry():
    """Handle both GET and POST requests on the same endpoint."""
    if request.method == "POST":
        # Get the input text and industry type from the form
        input_text = request.form.get("input_text")
        industry_type = int(request.form.get("industry_type"))

        if not input_text:
            print("Error : No input text provided!",flush=True)
            return redirect(url_for("register_industry"))

        try:
            # Choose the appropriate parsing function based on industry type
            if industry_type == INDUSTRY_MANUFACTURING:
                records = parsingManufacturing(input_text)
            elif industry_type == INDUSTRY_REPROCESSING:
                records = parsingReprocessing(input_text)
            else:
                print("Error : Industry type not yet supported.",flush=True)
                return redirect(url_for("register_industry"))

            # Store parsed records in the database
            storeToDB(records)

            print("Data successfully parsed and stored!",flush=True)
        except Exception as e:
            print(f"Error: {str(e)}",flush=True)

        return redirect(url_for("register_industry"))

    # Handle GET request
    # Get the 'init' parameter from the URL and set the default value for the dropdown
    init_value = request.args.get("init", default="1")  # Default to "Reprocessing"
    try:
        init_value = int(init_value)  # Ensure the value is an integer
    except ValueError:
        init_value = 1  # Fallback to default if invalid input is provided

    # Render the form for GET request
    return render_template_string("""
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Industry Parser</title>
        </head>
        <body>
            <h1>Industry Parser</h1>

            <!-- Flash messages -->
            {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %}
                    <ul>
                        {% for category, message in messages %}
                            <li class="{{ category }}">{{ message }}</li>
                        {% endfor %}
                    </ul>
                {% endif %}
            {% endwith %}

            <form method="POST">
                <label for="input_text">Enter your data:</label><br>
                <textarea id="input_text" name="input_text" rows="10" cols="50"></textarea><br><br>

                <!-- Dropdown for selecting industry type -->
                <label for="industry_type">Industry Relation Type:</label>
                <select id="industry_type" name="industry_type">
                    <option value="1" {% if init_value == 1 %}selected{% endif %}>Reprocessing</option>
                    <option value="2" {% if init_value == 2 %}selected{% endif %}>Manufacturing</option>
                    <!-- You can add more options for other industry types in the future -->
                </select><br><br>

                <button type="submit">Submit</button>
            </form>

        </body>
        </html>
        """,init_value=init_value)


# Function to process the first type of input (tab-separated item list)
def process_tab_separated_input(data):
    item_names = []
    lines = data.strip().split("\n")
    for line in lines:
        parts = line.split("\t")
        if len(parts) >= 1:  # Ensure there's at least one part (item name)
            item_names.append(parts[0].strip())
    return item_names

# Function to process the second type of input (material list with "x")
def process_material_list_input(data):
    item_names = []
    lines = data.strip().split("\n")
    for line in lines:
        if "x" in line:
            # Match the pattern, removing commas from the amount part
            match = re.match(r"(\d+(?:,\d{3})*)\s*x\s*(.*)", line.strip())
            if match:
                # Extract the item name, leaving commas intact in the name
                item_names.append(match.group(2).strip())
    return item_names


# Route to serve the form page and process input
@app.route("/input_items", methods=["GET", "POST"])
def input_item_to_DB():
    item_names = []  # Initialize an empty list to store item names
    
    if request.method == "POST":
        # Get the input data from the form
        input_data = request.form["data"]
        
        # Determine which type of input we're processing
        if "\t" in input_data and not "Time per run" in input_data:  # Check if the input contains tab-separated values
            item_names = process_tab_separated_input(input_data)
        elif " x " in input_data :  # Otherwise, treat it as a material list
            item_names = process_material_list_input(input_data)
        
        # Send requests for each item name
        for item_name in item_names:
            get_type_info(0,item_name)
            #print(f"Send Item : {item_name}",flush=True)
    # Inline HTML form definition
    form_html = '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Submit Item Data</title>
        <style>
            .item-list {
                margin-top: 20px;
                padding: 10px;
                border: 1px solid #ccc;
                max-height: 300px;
                overflow-y: auto;
                background-color: #f9f9f9;
            }
            .item-list ul {
                list-style-type: none;
                padding-left: 0;
            }
            .item-list li {
                padding: 5px 0;
                border-bottom: 1px solid #ddd;
            }
        </style>
    </head>
    <body>
        <h1>Submit Item Data</h1>
        <form action="/input_items" method="POST">
            <label for="data">Enter Item Data:</label><br>
            <textarea name="data" id="data" rows="10" cols="50">{{ request.form['data'] if request.form else '' }}</textarea><br><br>
            <button type="submit">Submit</button>
        </form>

        {% if item_names %}
        <div class="item-list">
            <h3>Processed Item Names:</h3>
            <ul>
                {% for item_name in item_names %}
                <li>{{ item_name }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
    </body>
    </html>
    '''
    
    return render_template_string(form_html, item_names=item_names)


# Buyback stock management tool.

@app.route("/stock_update", methods=["GET", "POST"])
def stock_update():
    if request.method == "POST":
        # Get the input data from the form
        input_data = request.form['input_data']
        
        # Split the input data by new lines
        lines = input_data.splitlines()

        conn = connect_to_db()
        cursor = conn.cursor()

        # Loop through each line and process it
        for line in lines:
            columns = line.split('\t')
            if len(columns) < 7:  # Ensure the line has enough columns
                continue

            item_name = columns[0]
            amount = columns[1].replace(',', '')  # Remove commas in the amount (e.g., "14,907" -> "14907")
            try:
                amount = int(amount)
            except ValueError:
                continue  # If amount is invalid, skip this line

            # Get type_id using the get_typeid_by_itemname function
            type_id = get_typeid_by_itemname(item_name)
            if not type_id:
                continue  # Skip this line if type_id not found

            # Use ON CONFLICT to insert or update the record
            cursor.execute("""
                INSERT INTO industry_stock (type_id, amount, name_en)
                VALUES (%s, %s, %s)
                ON CONFLICT (type_id) 
                DO UPDATE SET 
                    amount = EXCLUDED.amount, 
                    name_en = EXCLUDED.name_en
            """, (type_id, amount, item_name))

        # Commit the changes to the database
        conn.commit()

        # Close the cursor and connection
        cursor.close()
        conn.close()

        return "Stock update successful!"
    else:
        # If GET request, return the form
        html_form = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stock Update</title>
            </head>
            <body>
                <h1>Update Stock</h1>
                <form method="POST" action="/stock_update">
                    <textarea name="input_data" rows="10" cols="50" placeholder="Enter item data here"></textarea><br>
                    <input type="submit" value="Submit">
                </form>
            </body>
            </html>
        """
        return render_template_string(html_form)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8010)
