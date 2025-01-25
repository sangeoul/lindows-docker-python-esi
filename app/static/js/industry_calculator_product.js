
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

        console.log("Creating "+itemname+" Panel.");
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
        this.opened=level?false:true;

        this.me_bonus = 0;
        this.rig_bonus = 0;
        this.structure_bonus = 0;

        this.table_panel=document.createElement("table");
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

                await data.m.map(async (rel, index) => {
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
                });
            } else {
                // No data case
                this.industry_type = INDUSTRY_TYPE_NO_DATA; // Set industry_type to INDUSTRY_TYPE_NO_DATA when there is no data
            }

            

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
    async calcCost() {
        if (this.materials.length === 0) {
            this.costprice = 0;
        } else {
            let total = 0;
            console.log("!!DEBUG : calcCost(" +this.itemname+");");
            this.materials.forEach(material => {
                if (material.pricetype === PRICETYPE_BUY) {
                    total += material.buyprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_SELL) {
                    total += material.sellprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_COST) {
                    material.calcCost(); // Calculate the custom price for the material
                    total += material.costprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_CUSTOM) {
                    material.calcCost(); // Calculate the custom price for the material
                    total += material.customprice * material.getQuantity();
                }

            });
            console.log("!!DEBUG : "+this.itemname+" total==" +total+";");
            this.costprice = total/this.getQuantity();
        }
        this.updateTable();
    }
    async loadAndCalcCost(){
        console.log("!!DEBUG : loadAndCalcCost("+this.itemname+");");

        const promises=this.materials.map( async(material)=>{
            await material.getMarketPrices();
        });
        // Wait for all prices to be fetched and calculate the custom price for the original product
        await Promise.all(promises);
        console.log("!!DEBUG : promise finish ("+this.itemname+")");
        this.calcCost();

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
        itemIconCell.classList.add('product-icon');
        itemIconCell.addEventListener("click",()=>{
            this.selectPanel();
        });

        // Item Name Area
        itemNameCell.textContent = Math.ceil(this.getQuantity()).toString()+" x "+ this.itemname;
        itemNameCell.classList.add('product-name');
        itemNameCell.addEventListener("click",()=>{
            this.selectPanel();
        });
        

        // Setting Icon Area
        settingIconCell.classList.add('product-setting');
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
        buyRow.setAttribute('id','tr-buy-price');
        buyRow.classList.add('buy-row');

        const buyLabelCell = document.createElement('td');
        buyLabelCell.classList.add('buy-label');
        const buyPriceCell = document.createElement('td');
        buyPriceCell.classList.add('buy-price');
        const buyRadioCell = document.createElement('td');
        buyRadioCell.classList.add('buy-radio');
        buyLabelCell.textContent = 'Buy:';
        buyPriceCell.textContent = this.buyprice.toFixed(2);
        buyPriceCell.setAttribute('id','td-buy-price');
        const buyRadio = document.createElement('input');
        buyRadio.type = 'radio';
        buyRadio.name = `price-type-${this.product_index}`;
        buyRadio.value = 1;
        buyRadio.checked = (this.pricetype === PRICETYPE_BUY);
        buyRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_BUY && this.manufacturing_level));
        buyRadioCell.appendChild(buyRadio);
        buyRow.appendChild(buyLabelCell);
        buyRow.appendChild(buyPriceCell);
        buyRow.appendChild(buyRadioCell);

        const sellRow = document.createElement('tr');
        sellRow.setAttribute('id','tr-sell-price');
        buyRow.classList.add('sell-row');

        const sellLabelCell = document.createElement('td');
        const sellPriceCell = document.createElement('td');
        const sellRadioCell = document.createElement('td');
        sellLabelCell.textContent = 'Sell:';
        sellPriceCell.textContent = this.sellprice.toFixed(2);
        sellPriceCell.setAttribute('id','td-sell-price');
        const sellRadio = document.createElement('input');
        sellRadio.type = 'radio';
        sellRadio.name = `price-type-${this.product_index}`;
        sellRadio.value = 2;
        sellRadio.checked = (this.pricetype === PRICETYPE_SELL);
        sellRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_SELL && this.manufacturing_level));
        sellRadioCell.appendChild(sellRadio);
        sellRow.appendChild(sellLabelCell);
        sellRow.appendChild(sellPriceCell);
        sellRow.appendChild(sellRadioCell);

        const costRow = document.createElement('tr');
        costRow.setAttribute('id','tr-cost-price');
        buyRow.classList.add('cost-row');

        const costLabelCell = document.createElement('td');
        const costPriceCell = document.createElement('td');
        const costRadioCell = document.createElement('td');
        costLabelCell.textContent = 'Cost:';
        costPriceCell.textContent = this.costprice.toFixed(2);
        costPriceCell.setAttribute('id','td-cost-price');
        const costRadio = document.createElement('input');
        costRadio.type = 'radio';
        costRadio.name = `price-type-${this.product_index}`;
        costRadio.value = 3;
        costRadio.checked = (this.pricetype === PRICETYPE_COST);
        costRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_COST && this.manufacturing_level));
        costRadioCell.appendChild(costRadio);
        costRow.appendChild(costLabelCell);
        costRow.appendChild(costPriceCell);
        costRow.appendChild(costRadioCell);

        const customRow = document.createElement('tr');
        customRow.setAttribute('id','tr-custom-price');
        buyRow.classList.add('custom-row');

        const customPriceInputCell = document.createElement('td');
        const customRadioCell = document.createElement('td');
        const customPriceInput = document.createElement('input');
        customPriceInput.type = 'number';
        customPriceInput.min = 0;
        customPriceInput.step = 0.01;
        customPriceInput.value = this.customprice;
        customPriceInput.classList.add('custom-price-input');
        customPriceInputCell.colSpan = 2;
        customPriceInputCell.setAttribute('id','td-custom-price');
        customPriceInputCell.appendChild(customPriceInput);
        const customRadio = document.createElement('input');
        customRadio.type = 'radio';
        customRadio.name = `price-type-${this.product_index}`;
        customRadio.value = 0;
        customRadio.checked = (this.pricetype===PRICETYPE_CUSTOM);
        customRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_CUSTOM || !this.manufacturing_level));
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
            if(this.opened){
                this.closeTree();
            }
            else{
                this.openNextTree();
            }
            
        });
        if(this.industry_type!=INDUSTRY_TYPE_NO_DATA){
            nextTreeCell.appendChild(nextTreeButton);
        }
        
        row2.appendChild(priceTableCell);
        row2.appendChild(nextTreeCell);

        this.table_panel=document.createElement('table');
        this.table_panel.classList.add('product-table-panel');
        this.table_panel.classList.toggle("hidden-data",!this.visibility);

        this.table_panel.appendChild(row1);
        this.table_panel.appendChild(row2);

        const manufacturing_board=document.querySelector("#product-panel-lv"+this.manufacturing_level);
        
        manufacturing_board.appendChild(this.table_panel);
        this.showPanel();

    }

    async updateTable(){

        const tdItemName=this.table_panel.querySelector(".product-name");
        const tdBuyPrice=this.table_panel.querySelector("#td-buy-price");
        const tdSellPrice=this.table_panel.querySelector("#td-sell-price");
        const tdCostPrice=this.table_panel.querySelector("#td-cost-price");

        tdItemName.textContent = Math.ceil(this.getQuantity()).toString()+"x "+ this.itemname;
        tdBuyPrice.textContent = this.buyprice.toFixed(2);
        tdSellPrice.textContent = this.sellprice.toFixed(2);
        tdCostPrice.textContent = this.costprice.toFixed(2);

        this.openPriceTable();

    }
    async openPriceTable(selected=this.selected){
        if(this.manufacturing_level===0){
            this.table_panel.querySelector("#tr-buy-price").classList.toggle("hidden-data",false);
            this.table_panel.querySelector("#tr-sell-price").classList.toggle("hidden-data",false);
            this.table_panel.querySelector("#tr-cost-price").classList.toggle("hidden-data",false);
            this.table_panel.querySelector("#tr-custom-price").classList.toggle("hidden-data",true);
        }

        this.table_panel.classList.toggle("selected-panel",selected);
        this.table_panel.querySelector("#tr-buy-price").classList.toggle("hidden-data",!selected);
        this.table_panel.querySelector("#tr-sell-price").classList.toggle("hidden-data",!selected);
        this.table_panel.querySelector("#tr-cost-price").classList.toggle("hidden-data",!selected);
        this.table_panel.querySelector("#tr-custom-price").classList.toggle("hidden-data",!selected);
        if(this.pricetype===PRICETYPE_BUY)
            this.table_panel.querySelector("#tr-buy-price").classList.toggle("hidden-data",false);
        if(this.pricetype===PRICETYPE_SELL)
            this.table_panel.querySelector("#tr-sell-price").classList.toggle("hidden-data",false);
        if(this.pricetype===PRICETYPE_COST)
            this.table_panel.querySelector("#tr-cost-prfice").classList.toggle("hidden-data",false);
        if(this.pricetype===PRICETYPE_CUSTOM)
            this.table_panel.querySelector("#tr-custom-price").classList.toggle("hidden-data",false);
    }

    async openNextTree(){

        if(this.manufacturing_level){
            await this.product_node.materials.forEach(material=>{
                material.closeTree();
            });
        }
        

        this.opened=true;
        this.selectPanel();
        console.log("Opening "+this.itemname+"...");
        if(!this.industry_type==INDUSTRY_TYPE_NO_DATA){
            return;
        }
        if(this.materials.length==0){
            await this.setMaterials();
            this.loadAndCalcCost();
        }
        //await this.sortMaterials();
        await this.updateTable();
        
        this.materials.forEach(material=>{
            material.showPanel(true);
        });
    }

    async closeTree(){
        this.opened=false;
        this.materials.forEach(material=>{
            material.showPanel(false);
            material.opened=false;
            material.closeTree();
        });
    }

    async selectPanel(){

        if(this.manufacturing_level==0){
            this.openPriceTable(true);
            return;
        }
        for (const materials of this.product_node.materials){
            materials.selected=false;
            materials.table_panel.classList.toggle("selected-panel",false);
            materials.openPriceTable(false);
        }
        this.selected=true;
        this.openPriceTable();
        console.log("Panel " +this.itemname+" is selected.");
        

    }
    async showPanel(v=this.visibility){
        this.visibility=v;
        if(this.manufacturing_level==0){
            return;
        }
        this.table_panel.classList.toggle("hidden-data",!v);
        
        if(v){
            console.log("Show '"+this.itemname+"' Panel.");
        }
        if(!v){
            console.log("Hide '"+this.itemname+"' Panel.");
        }
            
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
    origin_product.openPriceTable();

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
