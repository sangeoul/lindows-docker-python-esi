import yaml
import json
import os
import datetime
from psycopg2.extras import execute_values
from iteminfo import get_type_info
from esi_library import connect_to_db

CHUNK_SIZE = 400

# Function to read YAML file
def read_yaml(file_path):
    with open(file_path, 'r') as file:
        return yaml.safe_load(file)

# Function to read JSON file
def read_json(file_path):
    with open(file_path, 'r') as file:
        return json.load(file)

# Function to save data to database
def save_to_db(data, conn, cursor):
    try:
        if not data:
            print("No data to insert.")
            return

        query = """
        INSERT INTO industry_relation (output_id, output_amount, input_id, input_amount, industry_type, recipe_id)
        VALUES %s
        ON CONFLICT (output_id, input_id, industry_type) 
        DO UPDATE SET output_amount = excluded.output_amount
        """
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] Inserting chunk of size: {len(data)}", flush=True)  # Debugging: Print chunk size
        execute_values(cursor, query, data)
        affected_rows = cursor.rowcount  # Check affected rows
        print(f"{affected_rows} rows affected in this chunk.", flush=True)  # Debugging: Print affected rows for this chunk

        conn.commit()
    except Exception as e:
        print(f"An error occurred: {e}", flush=True)
        conn.rollback()  # Rollback the transaction in case of error

# Main function
def main(yaml_material, json_bp, searching_group, conn):
    data = read_yaml(yaml_material)
    bpdata = read_json(json_bp)

    module_info_list = []
    total_items = 0  # Keep track of total items processed

    for type_id, details in data.items():
        type_id = int(type_id)  # Ensure type_id is an integer
        print(f"type_id: {type_id}", flush=True)
        type_info_response = get_type_info(type_id, str(type_id))
        type_info = type_info_response.get_json()

        if type_info.get('group_id') in searching_group:
            manufacturing_quantity = bpdata.get(str(type_id), {}).get('q', 0)
            if manufacturing_quantity:

                for material in details['materials']:
                    output_id = material['materialTypeID']
                    output_amount = material['quantity']
                    # Get data from JSON
                    module_info_list.append(
                            (output_id, output_amount, type_id, manufacturing_quantity, 1, type_id)  # = (output_id, output_amount, input_id, input_amount, industry_type, recipe_id)
                        )

                    if len(module_info_list) >= CHUNK_SIZE:
                        with conn.cursor() as cursor:
                            save_to_db(module_info_list, conn, cursor)
                        module_info_list.clear()  # Clear the list after saving to DB
                print(f"{type_info.get('name_en')} has been loaded", flush=True)
            else:
                print(f"{type_info.get('name_en')} has no manufacturing data", flush=True)
        else:
            print(f"{type_info.get('name_en')} is not charge", flush=True)

    # Save any remaining items in the list
    if module_info_list:
        with conn.cursor() as cursor:
            save_to_db(module_info_list, conn, cursor)

    total_items += len(module_info_list)  # Update total items processed
    print(f"Total items processed: {total_items}", flush=True)  # Debugging: Print total count of items processed

if __name__ == "__main__":
    # YAML file path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    yaml_material = os.path.join(base_dir, 'static', 'typeMaterials.yaml')
    json_bp = os.path.join(base_dir, 'static', 'json/manufacturings.json')

    # Define the modules_group as a list
    drone_group = [
    97,
    100,
    101,
    299,
    470,
    544,
    545,
    549,
    639,
    640,
    641,
    1023,
    1159
  ]

    # Database connection
    conn = connect_to_db()

    # Run the main function
    main(yaml_material, json_bp, drone_group, conn)

    # Close the database connection
    conn.close()
