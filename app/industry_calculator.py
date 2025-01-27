0import os
import aiohttp
import asyncio
import json
from datetime import datetime
from flask import Flask, render_template, request
from esi_library import connect_to_db  # Update with your actual database module

app = Flask(__name__)

@app.route('/industry_calculator')
def industry_calculator():
    update_param = request.args.get('update')
    if update_param and (update_param == '1' or update_param.lower()) == 'true':
        asyncio.run(fetch_and_save_json("https://esi.evetech.net/latest/markets/prices/?datasource=tranquility", "market_eiv_prices"))
    return render_template("industry_calculator.html")

async def fetch_and_save_json(api_url, filename):
    try:
        # Send a GET request to the API
        async with aiohttp.ClientSession() as session:
            async with session.get(api_url) as response:
                response.raise_for_status()  # Raise an HTTPError for bad responses (4xx and 5xx)
                # Get JSON data from the response
                json_data = await response.json()

                # Generate timestamp for the file name
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                base_dir = os.path.dirname(os.path.abspath(__file__))
                output_file = os.path.join(base_dir, 'static', 'json', f"{filename}_{timestamp}.json")

                # Remove old files
                for oldfile in os.listdir(os.path.join(base_dir, 'static', 'json')):
                    if oldfile.startswith(f"{filename}_") and oldfile.endswith(".json"):
                        try:
                            os.remove(os.path.join(base_dir, 'static', 'json', oldfile))
                        except Exception as e:
                            print(f"Error deleting file {oldfile}: {e}")

                # Write JSON data to a new file with the timestamp
                with open(output_file, 'w', encoding='utf-8') as file:
                    json.dump(json_data, file, ensure_ascii=False, indent=4)

                print(f"Data fetched and saved to {output_file}")

    except aiohttp.ClientError as e:
        print(f"Error fetching data from API: {e}")

def read_latest_json(filename):
    # Find the latest JSON file based on timestamp in the file name
    latest_file = None
    latest_timestamp = None
    base_dir = os.path.dirname(os.path.abspath(__file__))

    for lfile in os.listdir(os.path.join(base_dir, 'static', 'json')):
        if lfile.startswith(f"{filename}_") and lfile.endswith(".json"):
            file_timestamp = lfile[len(f"{filename}_"):-len(".json")]
            if latest_timestamp is None or file_timestamp > latest_timestamp:
                latest_timestamp = file_timestamp
                latest_file = lfile

    if latest_file:
        latest_file_path = os.path.join(base_dir, 'static', 'json', latest_file)
        with open(latest_file_path, 'r', encoding='utf-8') as file:
            json_data = json.load(file)
        print(f"Latest data read from {latest_file_path}")
        return json_data
    else:
        print("No JSON files found in the directory.")
        return None
