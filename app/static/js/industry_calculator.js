// Object to store price data
const eivData = {};

// Object to store system data
const systemData = [];

// Access blueprint data from data attribute
const blueprintDataElement = document.getElementById('blueprint-data');
const blueprintData = JSON.parse(blueprintDataElement.getAttribute('data-blueprints'));

// Function to fetch data from the API and store it
async function loadEivPriceData() {
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

        // Sort systemData by solar_system_name in ascending order
        systemData.sort((a, b) => a.solar_system_name.localeCompare(b.solar_system_name));

        console.log('System data fetched and structured successfully.');
        // Optionally, log the first few entries
        console.log(systemData.slice(0, 5));

        // Populate system datalists
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
    
        // Add event listener to the "Manufacturing" system input
        const manufacturingSystemInput = document.querySelector('input[list="manufacturing-system-options"]');
        manufacturingSystemInput.addEventListener('input', function() {
            const newValue = manufacturingSystemInput.value;
            updateOtherSystemInputs(newValue);
            setManufacturingStructureAndRigData();
        });
        const componentSystemInput = document.querySelector('input[list="component-system-options"]');
        componentSystemInput.addEventListener('input', function() {
            setManufacturingStructureAndRigData();
        })
        const reactionSystemInput = document.querySelector('input[list="reaction-system-options"]');
        reactionSystemInput.addEventListener('input', function() {
            setManufacturingStructureAndRigData();
        })
        const fuelSystemInput = document.querySelector('input[list="fuel-system-options"]');
        fuelSystemInput.addEventListener('input', function() {
            setManufacturingStructureAndRigData();
        })

    } catch (error) {
        console.error('Error fetching system data:', error);
    }
}

function setManufacturingStructureAndRigData() {
    // Example options for Manufacturing Structure&Rig select element
    const manufacturingStructureRigOptions = [
        { structure_bonus: 1, rig_bonus: 2, text: 'Engineering I' },
        { structure_bonus: 1, rig_bonus: 2.4, text: 'Engineering II' },
        //{ bonus: 1, text: 'Engineering Thukker' },
        { structure_bonus: 0, rig_bonus: 2, text: 'Other I' },
        { structure_bonus: 0, rig_bonus: 2.4, text: 'Other II' },
        //{ bonus: 1, text: 'Other Thuk' },
        { structure_bonus: 1, rig_bonus: 0, text: 'Engineering' },
        { structure_bonus: 0, rig_bonus: 0, text: 'Station' }
    ];
    const reactionStructureRigOptions = [
        { structure_bonus: 0, rig_bonus: 1, text: 'Refinery I' },
        { structure_bonus: 0, rig_bonus: 1, text: 'Refinery II' }
    ];

    const manufacturingSelect = document.querySelector(".manufacturing-structure-select");
    const componentSelect = document.querySelector(".component-structure-select");
    const reactionSelect = document.querySelector(".reaction-structure-select");
    const fuelSelect = document.querySelector(".fuel-structure-select");


    // Populate Manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=2.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = option.bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        manufacturingSelect.appendChild(optionElement);
    });

    // Populate Component manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=2.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = option.bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        componentSelect.appendChild(optionElement);
    });

    // Populate Reation Structure&Rig select element
    reactionStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=1.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = option.bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        reactionSelect.appendChild(optionElement);
    });

    // Populate Fuel manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=2.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = option.bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        fuelSelect.appendChild(optionElement);
    });
}

// Function to update the other system inputs
function updateOtherSystemInputs(newValue) {
    const otherSystemInputs = [
        document.querySelector('input[list="component-system-options"]'),
        document.querySelector('input[list="reaction-system-options"]'),
        document.querySelector('input[list="fuel-system-options"]')
    ];

    otherSystemInputs.forEach(input => {
        input.value = newValue;
    });
}




async function loadBlueprintsData() {
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
    
    loadBlueprintsData();
    loadSystemData();
    loadEivPriceData();
    setManufacturingStructureAndRigData()
    
});
