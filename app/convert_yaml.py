import yaml
import os
from psycopg2.extras import execute_values
from iteminfo import get_type_info
from esi_library import connect_to_db

# Function to read YAML file
def read_yaml(file_path):
    with open(file_path, 'r') as file:
        return yaml.safe_load(file)
    
# Function to save data to database
def save_to_db(data, conn, cursor):
    query = """
    INSERT INTO industry_relation (output_id, output_amount, input_id, input_amount, industry_type, recipe_id)
    VALUES %s
    ON CONFLICT (output_id, input_id, industry_type) 
    DO UPDATE SET output_amount = excluded.output_amount
    """
    execute_values(cursor, query, data)
    conn.commit()

# Main function
def main(yaml_file, modules_group, conn):
    data = read_yaml(yaml_file)
    
    module_info_list = []
    for type_id, details in data.items():
        type_id = int(type_id)  # Ensure type_id is an integer
        print(f"type_id:{type_id}",flush=True)
        type_info = get_type_info(type_id)
        
        if type_info['group_id'] in modules_group:
            for material in details['materials']:
                output_id = material['materialTypeID']
                output_amount = material['quantity']
                module_info_list.append(
                    (output_id, output_amount, type_id, 1, 1, type_id)
                )
            print(f"{type_info['name_en']} has been loaded",flush=True)
        else:
            print(f"{type_info['name_en']} is not module",flush=True)

    with conn.cursor() as cursor:
        save_to_db(module_info_list, conn, cursor)

if __name__ == "__main__":
    # YAML file path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    yaml_file = os.path.join(base_dir, 'static', 'typeMaterials.yaml')

    # Define the modules_group as a list
    modules_group = [
        38, 39, 40, 41, 43, 46, 47, 48, 49, 52, 53, 54, 55, 56, 57, 59, 60, 61, 62, 63, 65, 67, 68, 71, 72, 74, 76, 
        77, 78, 80, 82, 96, 98, 201, 202, 203, 205, 208, 209, 210, 211, 212, 213, 225, 285, 289, 290, 291, 295, 302, 
        308, 309, 315, 316, 317, 321, 325, 326, 328, 329, 330, 338, 339, 341, 353, 357, 367, 378, 379, 405, 406, 407, 
        464, 472, 475, 481, 483, 499, 501, 506, 507, 508, 509, 510, 511, 512, 514, 515, 518, 524, 538, 546, 585, 586, 
        588, 589, 590, 638, 642, 644, 645, 646, 647, 650, 658, 660, 737, 753, 762, 763, 764, 765, 766, 767, 768, 769, 
        770, 771, 773, 774, 775, 776, 777, 778, 779, 781, 782, 786, 815, 842, 862, 878, 896, 899, 901, 904, 905, 1122, 
        1150, 1154, 1156, 1189, 1199, 1223, 1226, 1232, 1233, 1234, 1238, 1245, 1289, 1292, 1299, 1306, 1308, 1313, 
        1395, 1396, 1533, 1672, 1673, 1674, 1697, 1698, 1699, 1700, 1706, 1770, 1815, 1894, 1969, 1986, 1988, 2003, 
        2004, 2008, 2013, 2018, 4060, 4067, 4117, 4127, 4138, 4174, 4184, 4769, 4807
    ]

    # Database connection
    conn = connect_to_db()

    # Run the main function
    main(yaml_file, modules_group, conn)

    # Close the database connection
    conn.close()
