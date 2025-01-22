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
                body: JSON.stringify(ids    )
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

        /*
        customSystemInfo={solar_system_id: 32000000, solar_system_name: "Custom"};
        customSystemInfo["manufacturing"]=0.10;
        customSystemInfo["researching_time_efficiency"]=0.10;
        customSystemInfo["researching_material_efficiency"]=0.10;
        customSystemInfo["copying"]=0.10;
        customSystemInfo["invention"]=0.10;
        customSystemInfo["reaction"]=0.10;

        systemData.push(customSystemInfo);
        */

        // Sort systemData by solar_system_name in ascending order
        systemData.sort((a, b) => a.solar_system_name.localeCompare(b.solar_system_name));

        console.log('System data fetched and structured successfully.');
        // Optionally, log the first few entries
        console.log(systemData.slice(0, 5));


        // Add event listener to the "Manufacturing" system input
        const industrySystemInput = document.querySelector('input[list="industry-system-options"]');
        const industrySystemDataList = document.querySelector('#industry-system-options');

        systemData.forEach(system => {
            const optionElement = document.createElement("option");
            optionElement.value = system.solar_system_name;
            optionElement.setAttribute("data-solar_system_id", system.solar_system_id); // solar_system_id
            industrySystemDataList.appendChild(optionElement);
            //console.log(system.solar_system_name +" Set");
        });

        industrySystemInput.addEventListener('input', function() {
            const value = industrySystemInput.value;
            const isValueInOptions = Array.from(industrySystemDataList.options).some(option => option.value === value);
            if(isValueInOptions){
                const selectedOption = Array.from(industrySystemDataList.options).find(option => option.value === value);
                const system_index_id = selectedOption.getAttribute("data-solar_system_id");
                console.log("Selected System ID:", system_index_id);
                updateSystemIndex(system_index_id);
                setManufacturingStructureAndRigData();
            }

        });

    
    } catch (error) {
        console.error('Error fetching system data:', error);
    }
}

// Function to update the other system inputs
function updateSystemIndex(system_id) {

    const systemInfo = systemData.find(system => system.solar_system_id === parseInt(system_id, 10));

    if (!systemInfo) {
        console.error("System ID not found in systemData. ID : "+ system_id);
        return;
    }

    manufacturingSystemIndex=document.querySelector("#manufacturing-system-index");
    componentSystemIndex=document.querySelector("#component-system-index");
    reactionSystemIndex=document.querySelector("#reaction-system-index");
    fuelSystemIndex=document.querySelector("#fuel-system-index");

    //need system info from systemData by system_id

    manufacturingSystemIndex.value=systemInfo["manufacturing"] || 0;
    componentSystemIndex.value=systemInfo["manufacturing"] || 0;
    reactionSystemIndex.value=systemInfo["reaction"] || 0;
    fuelSystemIndex.value=systemInfo["manufacturing"] || 0;
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
        { structure_bonus: 0, rig_bonus: 2, text: 'Refinery I' },
        { structure_bonus: 0, rig_bonus: 2.4, text: 'Refinery II' }
    ];

    const manufacturingSelect = document.querySelector("#manufacturing-structure-select");
    const componentSelect = document.querySelector("#component-structure-select");
    const reactionSelect = document.querySelector("#reaction-structure-select");
    const fuelSelect = document.querySelector("#fuel-structure-select");

    manufacturingSelect.innerHTML="";
    componentSelect.innerHTML="";
    reactionSelect.innerHTML="";
    fuelSelect.innerHTML="";


    // Populate Manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=2.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        manufacturingSelect.appendChild(optionElement);
    });

    // Populate Component manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=2.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        componentSelect.appendChild(optionElement);
    });

    // Populate Reation Structure&Rig select element
    reactionStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=1.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        reactionSelect.appendChild(optionElement);
    });

    // Populate Fuel manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        SYSTEM_BONUS=2.1
        bonus=(1-(1-(option.rig_bonus*SYSTEM_BONUS/100))*(1-option.structure_bonus/100)) *100;
        const optionElement = document.createElement("option");
        optionElement.value = bonus;
        optionElement.textContent = option.text + ":"+bonus.toFixed(1).toString() + "%";
        fuelSelect.appendChild(optionElement);
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
