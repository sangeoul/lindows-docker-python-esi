// Object to store price data
const eivData = {};
// Object to store system data
const systemData = [];

// Function to fetch data from the API and store it
async function loadPriceData() {
    try {
        const response = await fetch('https://esi.evetech.net/latest/markets/prices/?datasource=tranquility');
        const data = await response.json();

        // Store data in the eivData object
        data.forEach(item => {
            eivData[item.type_id] = {
                adjusted_price: item.adjusted_price,
                average_price: item.average_price
            };
        });

        console.log('EIV Price data fetched and stored successfully.');
        // Optionally, log the first few entries
        console.log(Object.keys(eivData).slice(0, 5).map(key => ({ type_id: key, ...eivData[key] })));

    } catch (error) {
        console.error('Error fetching EIV price data:', error);
    }
}

// Function to fetch system data and store it
async function loadSystemData() {
    try {
        const response = await fetch('https://esi.evetech.net/latest/industry/systems/?datasource=tranquility');
        const systems = await response.json();
        const systemIds = systems.map(system => system.solar_system_id);

        // Function to fetch names in batches
        async function fetchNames(ids) {
            const response = await fetch('https://esi.evetech.net/latest/universe/names/?datasource=tranquility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids)
            });
            return response.json();
        }

        // Split systemIds into chunks of 1,000
        const chunkSize = 1000;
        const chunks = [];
        for (let i = 0; i < systemIds.length; i += chunkSize) {
            chunks.push(systemIds.slice(i, i + chunkSize));
        }

        // Fetch names for all chunks
        const namePromises = chunks.map(chunk => fetchNames(chunk));
        const namesResponses = await Promise.all(namePromises);
        const names = namesResponses.flat();

        // Map names to systems
        const nameMap = new Map(names.map(name => [name.id, name.name]));

        // Create the final structure
        systems.forEach(system => {
            const systemInfo = { solar_system_id: system.solar_system_id, solar_system_name: nameMap.get(system.solar_system_id) };
            system.cost_indices.forEach(index => {
                systemInfo[index.activity] = index.cost_index;
            });
            systemData.push(systemInfo);
        });

        console.log('System data fetched and structured successfully.');
        // Optionally, log the first few entries
        console.log(systemData.slice(0, 5));

        // Populate system datalists
        populateSystemDatalists(systemData);

    } catch (error) {
        console.error('Error fetching system data:', error);
    }
}

// Function to populate system datalists
function populateSystemDatalists(systemData) {
    const datalistIds = ["manufacturing-system-options", "component-system-options", "reaction-system-options", "fuel-system-options"];

    datalistIds.forEach(datalistId => {
        const datalist = document.getElementById(datalistId);
        systemData.forEach(system => {
            const optionElement = document.createElement("option");
            optionElement.value = system.solar_system_name;
            optionElement.setAttribute("data-solar_system_id", system.solar_system_id); // solar_system_id
            datalist.appendChild(optionElement);
        });
    });
}

async function loadBlueprintsData(){
    // Populate blueprint datalist
    const blueprintOptions = document.getElementById("blueprint-options");
    blueprintData.forEach(blueprint => {
        const optionElement = document.createElement("option");
        optionElement.value = blueprint[1]; // output_name
        optionElement.setAttribute("data-type_id", blueprint[0]); // output_id
        blueprintOptions.appendChild(optionElement);
    });
}

// Call the function to fetch and store data
document.addEventListener("DOMContentLoaded", function() {
    loadPriceData();
    loadSystemData();
    loadBlueprintsData();
});


class Product {
    constructor(itemname, typeid, iconurl, output_per_run, quantity, level, row, product_node) {
        this.itemname = itemname;
        this.typeid = typeid;
        this.iconurl = iconurl;
        this.output_per_run = output_per_run;
        this.quantity = quantity;

        this.buyprice = 0;
        this.sellprice = 0;
        this.customprice = 0;

        if (eivData[typeid]) {
            this.eiv = eivData[typeid].adjusted_price;
        } else {
            this.eiv=0;
            console.log(`Price data for "${itemname}" not found.`);
        }

        // pricetype 0: custom, 1: buy, 2: sell. Default = 1 (buy)
        this.pricetype = 1;

        this.industry_type = 0;
        this.material = new Array();

        this.manufacturing_level = level;
        this.manufacturing_row = row;
        this.product_node = product_node;

        this.selected = level ? 0 : 1;
        this.visibility = level ? 0 : 1;

        this.me_bonus = 0;
        this.rig_bonus = 0;
        this.structure_bonus = 0;
    }

    // Method to set materials by fetching data from API
    async setMaterials() {
        try {
            const response = await fetch(`https://lindows.kr:8009/api/industry_relation_info?type_id=${this.typeid}&industry_type=2`);
            const data = await response.json();

            // Process the relation data
            if (data.relation && data.relation.length > 0) {
                this.industry_type = data.industry_type; // Set the industry_type from the data
                const promises = data.relation.map(async (rel, index) => {
                    const material = new Product(
                        rel.input_name,
                        rel.input_id,
                        get_iconurl(rel.input_id),
                        rel.output_amount,
                        (rel.input_amount / rel.output_amount) * get_bonusmodifier(rel.input_id),
                        this.manufacturing_level + 1,
                        index,
                        this
                    );
                    this.material.push(material);
                    await material.getMarketPrices(); // Fetch market prices for each material
                });

                // Wait for all prices to be fetched
                await Promise.all(promises);
            } else {
                // No data case
                this.industry_type = -1; // Set industry_type to -1 when there is no data
            }

            // Calculate the custom price for the original product
            this.calcPrice();

        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    }

    // Method to set prices by fetching data from API
    async getMarketPrices() {
        try {
            const response = await fetch(`https://lindows.kr:8009/api/jitaprice?type_id=${this.typeid}`);
            const data = await response.json();

            // Set the buyprice and sellprice from the API response
            this.buyprice = data.buy;
            this.sellprice = data.sell;
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
    }

    // Method to calculate custom price based on materials
    calcPrice() {
        if (this.material.length === 0) {
            this.customprice = 0;
        } else {
            let total = 0;
            this.material.forEach(material => {
                if (material.pricetype === 1) {
                    total += material.buyprice * material.quantity;
                } else if (material.pricetype === 2) {
                    total += material.sellprice * material.quantity;
                } else if (material.pricetype === 0) {
                    material.calcPrice(); // Calculate the custom price for the material
                    total += material.customprice * material.quantity;
                }
            });
            this.customprice = total;
        }
    }
}

// Function to get the icon URL for a given type ID
function get_iconurl(type_id) {
    return `https://images.evetech.net/types/${type_id}/icon`;
}

// Placeholder function for get_bonusmodifier - to be defined later
function get_bonusmodifier(type_id) {
    // Default bonus modifier for now, should be replaced with actual logic
    return 1;
}
