// Object to store price data
const eivData = {};

// Object to store system data
const systemData = [];

// Access blueprint data from data attribute
let blueprintData;
let formulaData;
async function fetchData() {
    try {
        let response = await fetch('https://lindows.kr:8009/api/reaction_formulas');
        formulaData = await response.json();
        response = await fetch('https://lindows.kr:8009/api/manufacturing_blueprints');
        blueprintData = await response.json();
        console.log("Blueprints and Formulas have been loaded.");

    } catch (error) {
        console.error('Error loading Blueprints and Formulas:', error);
    }
}

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


// Function to set a cookie
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Function to get a cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Function to save the value of an element to a cookie
function saveValueToCookie(element) {
    const id = element.id;
    const value = element.type === 'checkbox' ? element.checked : element.value;
    setCookie(id, value, 365);
}

// Function to load the value from a cookie to an element
function loadValueFromCookie(element) {
    const id = element.id;
    const value = getCookie(id);
    if (value !== null) {
        if (element.type === 'checkbox') {
            element.checked = (value === 'true');
        } else {
            element.value = value;
        }
    }
}


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

        const industrySystemDataList = document.querySelector('#industry-system-options');

        systemData.forEach(system => {
            const optionElement = document.createElement("option");
            optionElement.value = system.solar_system_name;
            optionElement.setAttribute("data-solar_system_id", system.solar_system_id); // solar_system_id
            industrySystemDataList.appendChild(optionElement);
            //console.log(system.solar_system_name +" Set");
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

    manufacturingSystemIndex.value=(systemInfo["manufacturing"]*100).toFixed(2) || 0.1;
    componentSystemIndex.value=(systemInfo["manufacturing"]*100).toFixed(2) || 0.1;
    reactionSystemIndex.value=(systemInfo["reaction"]*100).toFixed(2) || 0.1;
    fuelSystemIndex.value=(systemInfo["manufacturing"]*100).toFixed(2) || 0.1;

    calcStructureBonus("manufacturing");
    calcStructureBonus("component");
    calcStructureBonus("reaction");
    calcStructureBonus("fuel");
    
}

async function loadSystemIndex(){

    
    const industrySystemInput = document.querySelector('input[list="industry-system-options"]');
    const industrySystemDataList = document.querySelector('#industry-system-options');
    const value = industrySystemInput.value;
    const isValueInOptions = Array.from(industrySystemDataList.options).some(option => option.value === value);
    if(isValueInOptions){
        const selectedOption = Array.from(industrySystemDataList.options).find(option => option.value === value);
        const system_index_id = selectedOption.getAttribute("data-solar_system_id");
        console.log("Selected System ID:", system_index_id);
        updateSystemIndex(system_index_id);
        
    }

}


function setManufacturingStructureAndRigData() {


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

        
        const optionElement = document.createElement("option");
        optionElement.value = (option.structure_bonus*10)+option.rig_bonus;
        optionElement.textContent = option.text;
        manufacturingSelect.appendChild(optionElement);
    });

    // Populate Component manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        const optionElement = document.createElement("option");
        optionElement.value = (option.structure_bonus*10)+option.rig_bonus;
        optionElement.textContent = option.text;
        componentSelect.appendChild(optionElement);
    });

    // Populate Reation Structure&Rig select element
    reactionStructureRigOptions.forEach(option => {

        const optionElement = document.createElement("option");
        optionElement.value = (option.structure_bonus*10)+option.rig_bonus;
        optionElement.textContent = option.text;
        reactionSelect.appendChild(optionElement);
    });

    // Populate Fuel manufacturing Structure&Rig select element
    manufacturingStructureRigOptions.forEach(option => {

        const optionElement = document.createElement("option");
        optionElement.value = (option.structure_bonus*10)+option.rig_bonus;
        optionElement.textContent = option.text;
        fuelSelect.appendChild(optionElement);
    });

    
}

async function calcStructureBonus(industry_type) {

    /*
    const manufacturingStructureRigOptions = [
        { structure_bonus: 1, rig_bonus: 2, text: 'Engineering I' },
        { structure_bonus: 1, rig_bonus: 2.4, text: 'Engineering II' },
        { structure_bonus: 0, rig_bonus: 2, text: 'Other I' },
        { structure_bonus: 0, rig_bonus: 2.4, text: 'Other II' },
        { structure_bonus: 1, rig_bonus: 0, text: 'Engineering' },
        { structure_bonus: 0, rig_bonus: 0, text: 'Station' }
    ];
    const reactionStructureRigOptions = [
        { structure_bonus: 0, rig_bonus: 2, text: 'Refinery I' },
        { structure_bonus: 0, rig_bonus: 2.4, text: 'Refinery II' }
    ];
    */

    if (!["manufacturing", "component", "reaction", "fuel"].includes(industry_type)) {
        console.error('Invalid industry type:', industry_type);
        return;
    }

    const industrySystemInput = document.querySelector('input[list="industry-system-options"]');
    const industrySystemDataList = document.querySelector('#industry-system-options');
    const structureSelectInput = document.querySelector(`#${industry_type}-structure-select`);
    const structureBonusInput = document.querySelector(`#${industry_type}-structure-bonus`);

    const selectedSystemOption = Array.from(industrySystemDataList.options).find(option => option.value === industrySystemInput.value);
    if (!selectedSystemOption) {
        console.error('Selected system not found in datalist.');
        return;
    }
    const system_index_id = selectedSystemOption.getAttribute("data-solar_system_id");

    const selectedStructureOption = Array.from(structureSelectInput.options).find(option => option.selected);
    if (!selectedStructureOption) {
        console.error('Selected structure not found in select input.');
        return;
    }
    const selectedStructure = selectedStructureOption.textContent;

    const currentRigOption = industry_type === "reaction"
        ? reactionStructureRigOptions.find(option => option.text === selectedStructure)
        : manufacturingStructureRigOptions.find(option => option.text === selectedStructure);
    if (!currentRigOption) {
        console.error('Selected rig option not found.');
        return;
    }

    const response = await fetch(`https://esi.evetech.net/latest/universe/systems/${system_index_id}/?datasource=tranquility&language=en`);
    const jsonResult = await response.json();

    const systemSecurity = Math.round(parseFloat(jsonResult["security_status"])*10)/10;

    let SYSTEM_BONUS_MULTIPLIER;
    if (systemSecurity >= 0.5) SYSTEM_BONUS_MULTIPLIER = 1;
    else if (systemSecurity > 0) SYSTEM_BONUS_MULTIPLIER = 1.9;
    else SYSTEM_BONUS_MULTIPLIER = 2.1;

    const structure_bonus = Math.round(((1 - (1 - (currentRigOption.rig_bonus * SYSTEM_BONUS_MULTIPLIER / 100)) * (1 - currentRigOption.structure_bonus / 100)) * 100)*100000)/100000;
    structureBonusInput.value = structure_bonus;
}



async function loadBlueprintsData() {
    // Populate blueprint datalist
    const blueprintOptions = document.getElementById("blueprint-options");
    // Assuming blueprintData is an object with key-value pairs
    Object.entries(blueprintData).forEach(([key, value]) => {
        const optionElement = document.createElement("option");
        optionElement.value = value["n"]; // output_name
        optionElement.setAttribute("data-type_id", key); // output_id
        blueprintOptions.appendChild(optionElement);
    });
    Object.entries(formulaData).forEach(([key, value]) => {
        const optionElement = document.createElement("option");
        optionElement.value = value["n"]; // output_name
        optionElement.setAttribute("data-type_id", key); // output_id
        blueprintOptions.appendChild(optionElement);
    });

}

// Function to load panel visibility state from cookies
async function loadPanelVisibility() {
    const componentRow = document.querySelector("#component-setting-row");
    const reactionRow = document.querySelector("#reaction-setting-row");
    const fuelRow = document.querySelector("#fuel-setting-row");
    const opentree = document.querySelector("#opentree-checkboxs-area");

    // Load visibility state from cookies
    const componentVisible = getCookie('componentVisible') === 'true';
    const reactionVisible = getCookie('reactionVisible') === 'true';
    const fuelVisible = getCookie('fuelVisible') === 'true';
    const opentreeVisible = getCookie('opentreeCheckboxsVisible') === 'true';

    componentRow.classList.toggle('hidden-data', !componentVisible);
    reactionRow.classList.toggle('hidden-data', !reactionVisible);
    fuelRow.classList.toggle('hidden-data', !fuelVisible);
    opentree.classList.toggle('hidden-data',!opentreeVisible);
}


async function addAllEventListener(){

    const industrySystemInput = document.querySelector('input[list="industry-system-options"]');

    const manufacturingSelect = document.querySelector("#manufacturing-structure-select");
    const componentSelect = document.querySelector("#component-structure-select");
    const reactionSelect = document.querySelector("#reaction-structure-select");
    const fuelSelect = document.querySelector("#fuel-structure-select");



    industrySystemInput.addEventListener('input', function() {
        loadSystemIndex();

    });


    manufacturingSelect.addEventListener("input",function(){
        const selectedValue = manufacturingSelect.value;
        componentSelect.value = selectedValue;
        fuelSelect.value = selectedValue;
        calcStructureBonus("manufacturing");
        calcStructureBonus("component");
        calcStructureBonus("fuel");
    });
    componentSelect.addEventListener("input",function(){
        calcStructureBonus("component");
    });
    reactionSelect.addEventListener("input",function(){
        calcStructureBonus("reaction");
    });
    fuelSelect.addEventListener("input",function(){
        calcStructureBonus("fuel");
    });

    setTaxInputLink();


    const calculatorDetailButton = document.querySelector("#calculator-detail-button");
    const componentRow = document.querySelector("#component-setting-row");
    const reactionRow = document.querySelector("#reaction-setting-row");
    const fuelRow = document.querySelector("#fuel-setting-row");

    calculatorDetailButton.addEventListener('click', function() {
        const isInvisible = componentRow.classList.contains('hidden-data');
        if(isInvisible){
            calculatorDetailButton.innerHTML="▤▼";
        }
        else{
            calculatorDetailButton.innerHTML="▤▶";
        }
        componentRow.classList.toggle('hidden-data', !isInvisible);
        reactionRow.classList.toggle('hidden-data', !isInvisible);
        fuelRow.classList.toggle('hidden-data', !isInvisible);

        // Save visibility state to cookies
        setCookie('componentVisible', !componentRow.classList.contains('hidden-data'), 365);
        setCookie('reactionVisible', !reactionRow.classList.contains('hidden-data'), 365);
        setCookie('fuelVisible', !fuelRow.classList.contains('hidden-data'), 365);
    });

    const opentreeDetailButton = document.querySelector("#opentree-detail-button");
    const opentreeCheckboxs = document.querySelector("#opentree-checkboxs-area");
    opentreeDetailButton.addEventListener('click', function() {
        const isInvisible = opentreeCheckboxs.classList.contains('hidden-data');
        if(isInvisible){
            opentreeDetailButton.innerHTML="▤◀";
        }
        else{
            opentreeDetailButton.innerHTML="▤▶";
        }
        opentreeCheckboxs.classList.toggle('hidden-data', !isInvisible);

        // Save visibility state to cookies
        setCookie('opentreeCheckboxsVisible', !opentreeCheckboxs.classList.contains('hidden-data'), 365);
    });

    const calculateButton= document.querySelector("#calculate-button");
    calculateButton.addEventListener('click',function(){
        runCalculate();
    });
}

async function setTaxInputLink(){
    manufacturingTaxInput=document.querySelector('#manufacturing-tax');
    componentTaxInput=document.querySelector('#component-tax');
    reactionTaxInput=document.querySelector('#reaction-tax');
    fuelTaxInput=document.querySelector('#fuel-tax');

    manufacturingTaxInput.addEventListener("input",function(){
        const manufacturingTaxValue = manufacturingTaxInput.value;

        componentTaxInput.value = manufacturingTaxValue;
        reactionTaxInput.value = manufacturingTaxValue;
        fuelTaxInput.value = manufacturingTaxValue;
    });
}

// Call the function to fetch and store data
document.addEventListener("DOMContentLoaded", async function() {
    try {
        // Wait for all asynchronous functions to complete
        await fetchData();
        await Promise.all([
            
            loadBlueprintsData(),
            loadSystemData(),
            loadEivPriceData(),
            setManufacturingStructureAndRigData()        
        ]);

        // After all async functions are done, load values from cookies
        const inputs = document.querySelectorAll("input:not(#blueprint-input, #me-input), select");
        inputs.forEach(input => loadValueFromCookie(input));

        loadPanelVisibility();
        await loadSystemIndex();

        addAllEventListener();
    } catch (error) {
        console.error('Error loading data:', error);
    }
});



// Save values to cookies whenever they change
document.addEventListener("input", function(event) {
    const target = event.target;
    if (target.matches("input:not(#blueprint-input, #me-input), select")) {
        saveValueToCookie(target);
    }
});


