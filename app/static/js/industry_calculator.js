// Object to store price data
const eivData = {};

// Object to store system data
const systemData = [];

// Access blueprint data from data attribute
const blueprintDataElement = document.getElementById('blueprint-data');
const blueprintData = JSON.parse(blueprintDataElement.getAttribute('data-blueprints'));

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
