
const BONUS_SETTING_ICON_URL=""

const PRICETYPE_CUSTOM=0;
const PRICETYPE_BUY=1;
const PRICETYPE_SELL=2;
const PRICETYPE_COST=3;

const INDUSTRY_TYPE_NO_DATA=-1;
const INDUSTRY_TYPE_REPROCESSING = 1
const INDUSTRY_TYPE_MANUFACTURING = 2
const INDUSTRY_TYPE_REACTION = 3


const FUEL_BLOCKS=[4051,4246,4247,4312];


const QUANTITY_OPTION_ACCURATE=1;
const QUANTITY_OPTION_MINIMUM=2;

let quantity_option=1;

let origin_product="";

let product_index=1;


let industry_relation_cache={};
let market_price_cache={};



class Product {
    constructor(itemname, typeid, iconurl,industry_type, output_per_run, quantity,minimum_quantity, level, row, product_node,explicit_product_index=-1) {
        
        if(explicit_product_index==-1){
            this.product_index=product_index;
            product_index++;
        }

        console.log("Creating "+itemname+" Pannel.");
        this.itemname = itemname;
        this.typeid = typeid;
        this.iconurl = iconurl;
        this.output_per_run = output_per_run;
        this.quantity = quantity;
        this.minimum_unit_quantity=minimum_quantity;

        this.buyprice = 0;
        this.sellprice = 0;
        this.costprice = 0;

        if (eivData[typeid]) {
            this.eiv = eivData[typeid].adjusted_price;
        } else {
            this.eiv=0;
            console.log(`Price data for "${itemname}" not found.`);
        }

        // pricetype 0: custom, 1: buy, 2: sell. , 3: cost Default = 1 (buy)
        this.pricetype = PRICETYPE_BUY;

        this.industry_type = industry_type;
        this.materials = new Array();

        this.manufacturing_level = level;
        this.manufacturing_row = row;
        this.product_node = product_node;

        this.selected = false;
        this.visibility = level?false:true;

        this.me_bonus = 0;
        this.rig_bonus = 0;
        this.structure_bonus = 0;

        this.table_pannel=document.createElement("table");
        this.makeTable();
        this.getMarketPrices();
    }

    // Method to set materials by fetching data from API
    async setMaterials() {
        try {
            const data = await loadIndustryRelation(this.typeid);
            // Process the relation data
            if (data.industry_type!=INDUSTRY_TYPE_NO_DATA && data.m.length > 0) {
                this.industry_type = data.industry_type; // Set the industry_type from the data
                const output_unit=data.q;

                this.minimum_unit_quantity=Math.ceil(this.minimum_unit_quantity/output_unit)*output_unit;

                const promises = data.m.map(async (rel, index) => {
                    const material_material_data = await loadIndustryRelation(rel.i);
                    let material_industry_type=INDUSTRY_TYPE_NO_DATA;
                    if(material_material_data.industry_type!=INDUSTRY_TYPE_NO_DATA && material_material_data.m.length>0){
                        material_industry_type=material_material_data.industry_type;
                    }
                    
                    const material = new Product(
                        rel.n,
                        rel.i,
                        get_iconurl(rel.i),
                        material_industry_type,
                        data.q,
                        Math.ceil((rel.q*this.quantity / data.q) * get_bonusmodifier(rel.i)),
                        Math.ceil((rel.q*this.minimum_unit_quantity / data.q) * get_bonusmodifier(rel.i)),
                        this.manufacturing_level + 1,
                        index,
                        this
                    );
                    this.materials.push(material);
                    await material.getMarketPrices(); // Fetch market prices for each material
                });

                // Wait for all prices to be fetched
                await Promise.all(promises);
            } else {
                // No data case
                this.industry_type = INDUSTRY_TYPE_NO_DATA; // Set industry_type to INDUSTRY_TYPE_NO_DATA when there is no data
            }

            // Calculate the custom price for the original product
            this.calcPrice();

        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    }
    sortMaterials(pivot='priceSum') {
        if (pivot === 'priceSum') {
            this.materials.sort((a, b) => b.getPriceSum() - a.getPriceSum()); // Sort by priceSum DESC
        }
    }
    // Method to set prices by fetching data from API
    async getMarketPrices() {
        try {
            const data = await loadMarketDataWithCache(this.typeid);
            
            // Set the buyprice and sellprice from the API response
            this.buyprice = parseFloat(data.buy);
            this.sellprice = parseFloat(data.sell);
            this.updateTable();
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
    }

    // Method to calculate custom price based on materials
    async calcPrice() {
        if (this.materials.length === 0) {
            this.costprice = 0;
        } else {
            let total = 0;
            this.materials.forEach(material => {
                if (material.pricetype === PRICETYPE_BUY) {
                    total += material.buyprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_SELL) {
                    total += material.sellprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_COST) {
                    material.calcPrice(); // Calculate the custom price for the material
                    total += material.costprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_CUSTOM) {
                    material.calcPrice(); // Calculate the custom price for the material
                    total += material.customprice * material.getQuantity();
                }

            });
            this.costprice = total/this.getQuantity();
        }
        this.updateTable();
    }
    getPriceSum(){
        if(this.pricetype===PRICETYPE_BUY){
            return this.buyprice * this.getQuantity();
        }
        else if(this.pricetype===PRICETYPE_SELL){
            return this.sellprice * this.getQuantity();
        }
        else if(this.pricetype===PRICETYPE_COST){
            return this.costprice * this.getQuantity();
        }
        else if(this.pricetype===PRICETYPE_CUSTOM){
            return this.customprice * this.getQuantity();
        }
    }

    getQuantity(){
        if(quantity_option===QUANTITY_OPTION_MINIMUM){
            return this.minimum_unit_quantity;
        }
        else{
            return this.quantity;
        }
        
    }

    async makeTable(){
        
        const row1 = document.createElement('tr');
        const itemIconCell = document.createElement('td');
        const itemNameCell = document.createElement('td');
        const settingIconCell = document.createElement('td');

        // Item Icon Area
        if (this.iconurl) {
            const icon = document.createElement('img');
            icon.src = this.iconurl;
            icon.alt = this.itemname;
            icon.classList.add('product-icon');
            itemIconCell.appendChild(icon);
        } else {
            itemIconCell.textContent = 'No Icon';
        }
        itemIconCell.addEventListener("click",()=>{
            this.selectPannel();
        });

        // Item Name Area
        itemNameCell.textContent = Math.ceil(this.getQuantity()).toString()+"x "+ this.itemname;
        itemNameCell.classList.add('product-name');
        itemNameCell.addEventListener("click",()=>{
            this.selectPannel();
        });
        

        // Setting Icon Area
        const settingIcon = document.createElement('img');
        settingIcon.src = BONUS_SETTING_ICON_URL; // Replace with actual setting icon URL
        settingIcon.alt = 'Settings';
        settingIcon.classList.add('setting-icon');
        //settingIconCell.appendChild(settingIcon);
        settingIconCell.textContent=" [B]"

        row1.appendChild(itemIconCell);
        row1.appendChild(itemNameCell);
        row1.appendChild(settingIconCell);

        const row2 = document.createElement('tr');
        const priceTableCell = document.createElement('td');
        priceTableCell.colSpan = 2;

        // Price Table Area
        const priceTable = document.createElement('table');
        priceTable.classList.add('price-table');


        const buyRow = document.createElement('tr');
        const buyLabelCell = document.createElement('td');
        const buyPriceCell = document.createElement('td');
        const buyRadioCell = document.createElement('td');
        buyLabelCell.textContent = 'Buy:';
        buyPriceCell.textContent = this.buyprice.toFixed(2);
        buyRow.setAttribute('id','tr-buy-price');
        buyPriceCell.setAttribute('id','td-buy-price');
        const buyRadio = document.createElement('input');
        buyRadio.type = 'radio';
        buyRadio.name = `price-type-${this.product_index}`;
        buyRadio.value = 1;
        buyRadio.checked = (this.pricetype === PRICETYPE_BUY);
        buyRow.classList.toggle("hidden-data",this.pricetype!=PRICETYPE_BUY);
        buyRadioCell.appendChild(buyRadio);
        buyRow.appendChild(buyLabelCell);
        buyRow.appendChild(buyPriceCell);
        buyRow.appendChild(buyRadioCell);

        const sellRow = document.createElement('tr');
        const sellLabelCell = document.createElement('td');
        const sellPriceCell = document.createElement('td');
        const sellRadioCell = document.createElement('td');
        sellLabelCell.textContent = 'Sell:';
        sellPriceCell.textContent = this.sellprice.toFixed(2);
        sellRow.setAttribute('id','tr-sell-price');
        sellPriceCell.setAttribute('id','td-sell-price');
        const sellRadio = document.createElement('input');
        sellRadio.type = 'radio';
        sellRadio.name = `price-type-${this.product_index}`;
        sellRadio.value = 2;
        sellRadio.checked = (this.pricetype === PRICETYPE_SELL);
        sellRow.classList.toggle("hidden-data",this.pricetype!=PRICETYPE_SELL);
        sellRadioCell.appendChild(sellRadio);
        sellRow.appendChild(sellLabelCell);
        sellRow.appendChild(sellPriceCell);
        sellRow.appendChild(sellRadioCell);

        const costRow = document.createElement('tr');
        const costLabelCell = document.createElement('td');
        const costPriceCell = document.createElement('td');
        const costRadioCell = document.createElement('td');
        costLabelCell.textContent = 'Cost:';
        costPriceCell.textContent = this.costprice.toFixed(2);
        costRow.setAttribute('id','tr-cost-price');
        costPriceCell.setAttribute('id','td-cost-price');
        const costRadio = document.createElement('input');
        costRadio.type = 'radio';
        costRadio.name = `price-type-${this.product_index}`;
        costRadio.value = 3;
        costRadio.checked = (this.pricetype === PRICETYPE_COST);
        costRow.classList.toggle("hidden-data",this.pricetype!=PRICETYPE_COST);
        costRadioCell.appendChild(costRadio);
        costRow.appendChild(costLabelCell);
        costRow.appendChild(costPriceCell);
        costRow.appendChild(costRadioCell);

        const customRow = document.createElement('tr');
        const customPriceInputCell = document.createElement('td');
        const customRadioCell = document.createElement('td');
        const customPriceInput = document.createElement('input');
        customPriceInput.type = 'number';
        customPriceInput.min = 0;
        customPriceInput.step = 0.01;
        customPriceInput.value = this.customprice;
        customPriceInput.classList.add('custom-price-input');
        customPriceInputCell.colSpan = 2;
        customRow.setAttribute('id','tr-custom-price');
        customPriceInputCell.setAttribute('id','td-custom-price');
        customPriceInputCell.appendChild(customPriceInput);
        const customRadio = document.createElement('input');
        customRadio.type = 'radio';
        customRadio.name = `price-type-${this.product_index}`;
        customRadio.value = 0;
        customRadio.checked = (this.pricetype!=PRICETYPE_CUSTOM);
        customRow.classList.toggle("hidden-data",this.pricetype!=PRICETYPE_CUSTOM);
        customRadioCell.appendChild(customRadio);
        customRow.appendChild(customPriceInputCell);
        customRow.appendChild(customRadioCell);


        priceTable.appendChild(buyRow);
        priceTable.appendChild(sellRow);
        priceTable.appendChild(costRow);
        priceTable.appendChild(customRow);
        
        priceTableCell.appendChild(priceTable);
        
        const nextTreeCell = document.createElement('td');
        const nextTreeButton = document.createElement('button');
        nextTreeButton.textContent = '>';
        nextTreeButton.classList.add('next-tree-button');
        nextTreeButton.addEventListener('click',()=>{
            this.openNextTree();
        });
        if(this.industry_type!=INDUSTRY_TYPE_NO_DATA){
            nextTreeCell.appendChild(nextTreeButton);
        }
        
        row2.appendChild(priceTableCell);
        row2.appendChild(nextTreeCell);

        this.table_pannel=document.createElement('table');
        this.table_pannel.classList.add('product-table-pannel');
        this.table_pannel.classList.toggle("hidden-data",!this.visibility);

        this.table_pannel.appendChild(row1);
        this.table_pannel.appendChild(row2);

        const manufacturing_board=document.querySelector("#product-pannel-lv"+this.manufacturing_level);
        
        manufacturing_board.appendChild(this.table_pannel);
        this.showPannel();

    }

    async updateTable(){

        const tdItemName=this.table_pannel.querySelector(".product-name");
        const tdBuyPrice=this.table_pannel.querySelector("#td-buy-price");
        const tdSellPrice=this.table_pannel.querySelector("#td-sell-price");
        const tdCostPrice=this.table_pannel.querySelector("#td-cost-price");

        tdItemName.textContent = Math.ceil(this.getQuantity()).toString()+"x "+ this.itemname;
        tdBuyPrice.textContent = this.buyprice.toFixed(2);
        tdSellPrice.textContent = this.sellprice.toFixed(2);
        tdCostPrice.textContent = this.costprice.toFixed(2);

        this.openPriceTable();

    }
    async openPriceTable(selected=this.selected){

        this.table_pannel.classList.toggle("selected-pannel",selected);
        this.table_pannel.querySelector("#tr-buy-price").classList.toggle("hidden-data",!selected);
        this.table_pannel.querySelector("#tr-sell-price").classList.toggle("hidden-data",!selected);
        this.table_pannel.querySelector("#tr-cost-price").classList.toggle("hidden-data",!selected);
        this.table_pannel.querySelector("#tr-custom-price").classList.toggle("hidden-data",!selected);
        if(this.pricetype===PRICETYPE_BUY)
            this.table_pannel.querySelector("#tr-buy-price").classList.toggle("hidden-data".false);
        if(this.pricetype===PRICETYPE_SELL)
            this.table_pannel.querySelector("#tr-sell-price").classList.toggle("hidden-data".false);
        if(this.pricetype===PRICETYPE_COST)
            this.table_pannel.querySelector("#tr-cost-price").classList.toggle("hidden-data".false);
        if(this.pricetype===PRICETYPE_CUSTOM)
            this.table_pannel.querySelector("#tr-custom-price").classList.toggle("hidden-data".false);
    }

    async openNextTree(){

        console.log("Opening "+this.itemname+"...");
        if(!this.industry_type==INDUSTRY_TYPE_NO_DATA){
            return;
        }
        if(this.materials.length==0){
            await this.setMaterials();
        }
        await this.sortMaterials();
        await this.updateTable();
        this.materials.forEach(material=>{

            material.visibility=true;
            material.showPannel();
        });
    }
    async selectPannel(){

        if(this.manufacturing_level==0){
            return;
        }
        for (const materials of this.product_node.materials){
            materials.selected=false;
            materials.openPriceTable(false);
        }
        this.selected=true;
        this.openPriceTable();
        console.log("Pannel " +this.itemname+" is selected.");
        

    }
    async showPannel(){
        if(this.manufacturing_level==0){
            return;
        }
        this.table_pannel.classList.toggle("hidden-data",!this.visibility);
        /*
        if(this.visibility){
            console.log("Show '"+this.itemname+"' Pannel.");
        }
        if(!this.visibility){
            console.log("Hide '"+this.itemname+"' Pannel.");
        }
            */
    }
}

async function loadIndustryRelation(typeId){

    if(blueprintData[typeId]){
        blueprintData[typeId].industry_type=INDUSTRY_TYPE_MANUFACTURING;
        return blueprintData[typeId];
    }
    else if(formulaData[typeId]){
        formulaData[typeId].industry_type=INDUSTRY_TYPE_REACTION;
        return formulaData[typeId];
    }
    else{
        let nodata={"industry_type":INDUSTRY_TYPE_NO_DATA};
        nodata.industry_type=INDUSTRY_TYPE_NO_DATA;
        return nodata;
    }
}


async function loadMarketDataWithCache(typeId){

    if(!market_price_cache[typeId.toString()]){
        const response = await fetch(`https://lindows.kr:8009/api/jitaprice?type_id=${typeId}`);
        market_price_cache[typeId.toString()] = await response.json();
        return market_price_cache[typeId.toString()];
    }
    else{
        return market_price_cache[typeId.toString()];
    }    
}


//
async function runCalculate(){
    
    const inputBlueprint= document.querySelector('input[list="blueprint-options"]');
    const inputBlueprintRun=document.querySelector('#blueprint-run-input');
    const blueprintOptions = document.getElementById("blueprint-options");
    const selectedOption = Array.from(blueprintOptions.options).find(option => option.value === inputBlueprint.value);

    let typeId=0;
    
    if(selectedOption){
        typeId=selectedOption.getAttribute("data-type_id");
    }
    else{
        console.error("No matching option found with the blueprint");
        return;
    }
    
    const data = await loadIndustryRelation(typeId);
    let industry_type = data.industry_type;

    origin_product=new Product(
        inputBlueprint.value,
        typeId,
        get_iconurl(typeId),
        industry_type,
        data.q,
        inputBlueprintRun.value*data.q,
        0,
        0,
        null,
        0
    )

    await origin_product.openNextTree();

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
