
const MAX_TREE_DEPTH=12;

const BONUS_SETTING_ICON_URL=""

const PRICETYPE_CUSTOM=0;
const PRICETYPE_BUY=1;
const PRICETYPE_SELL=2;
const PRICETYPE_COST=3;

const INDUSTRY_TYPE_NO_DATA=-1;
const INDUSTRY_TYPE_REPROCESSING = 1
const INDUSTRY_TYPE_MANUFACTURING = 2
const INDUSTRY_TYPE_REACTION = 3

const SCC_SUBCHARGE=4.00;


const FUEL_BLOCKS = [4051,4246,4247,4312];
const CONSTRUCTION_COMPONENTS = [11530,11531,11532,11533,11534,11535,11536,11537,11538,11539,11540,11541,11542,11543,11544,11545,11547,11548,11549,11550,11551,11552,11553,11554,11555,11556,11557,11558,11688,11689,11690,11691,11692,11693,11694,11695,33195,52310,52311,52312,52313,52314,53288,53289,53290,57470,57471,57472,57473,57478,57479,57480,57481,57482,57483,57484,57485,57486,81063,81064,81065,81066,81067,81068,81069,83467,83468,83469,83470,83471,83472,83473];
const CAPITAL_CONSTRUCTION_COMPONENTS = [21009,21011,21013,21017,21019,21021,21023,21025,21027,21029,21035,21037,21039,21041,24545,24547,24556,24558,24560,53035,53036,53037,57487,57488,57489];
const COMPOSITE = [16670,16671,16672,16673,16678,16679,16680,16681,16682,16683,17317,33359,33360,33361,33362,57456,57457];
const INTERMEDIATE_MATERIALS = [16654,16655,16656,16657,16658,16659,16660,16661,16662,16663,16664,16665,16666,16667,16668,16669,17769,17959,17960,20431,29659,29660,29661,29662,29663,29664,32821,32822,32823,32824,32825,32826,32827,32828,32829,33336,33337,33338,33339,57453,57454,57455];
const BIOCHEMICAL_MATERIALS = [25237,25241,25242,25252,25283,25330,25331,25332,25333,25334,25335,25336,25337,25338,25339,25340,25341,25342,25343,25344,25345,25346,25347,25348,28686,28687,28688,28689,28690,28691,28692,28693];
const MOLECULAR_FORGED_MATERIALS = [57458,57459,57460,57461,57462,57463,57464,57465,57466,57467,57468,57469];
const NO_BLUEPRINT = new Set([34,35,36,37,38,39,40,11399, //Mineral
    16633,16634,16635,16636,16637,16638,16639,16640,16641,16642,16643,16644,16646,16647,16648,16649,16650,16651,16652,16653, // Moon Materials
    16272,16273,16274,16275,17887,17888,17889, //Ice Products
    25268,25273,25274,25275,25276,25277,25278,25279,28629,28630,28694,28695,28696,28697,28698,28699,28700,28701,30370,30371,30372,30373,30374,30375,30376,30377,30378,49787,50175,52193,52194,52204 //Harvestable Cloud (Gas)
]);
const QUANTITY_OPTION_PRICE=1;
const QUANTITY_OPTION_MATERIAL=2;


class LinkedListNode{
    constructor(value,previous=null,next=null){
        this.value=value;
        this.prev=previous;
        this.next=next;
    }
}
class LinkedList{
    constructor(){
        this.head=null;
        this.tail=null;
        this.size=0;
    }

    add(value){
        
        if(!this.head){
            this.head=new LinkedListNode(value);
            this.tail=this.head;
        }else{
            let c= this.head;
            while(c.next){
                c=c.next;
            }
            c.next=new LinkedListNode(value,c);
            this.tail=c.next;
        }
        this.size++;
    }
    get(idx){
        if(idx>=this.size){
            return null;
        }
        let i=0;
        let c=this.head;
        for(;i<idx;i++){
            c=c.next;
        }
        return c.value;
    }
    find(value){
        let i=0;
        let c=this.head;
        for(;i<this.size;i++){
            if(c.value==value){
                return i;
            }
            c=c.next;
        }
        return -1;
    }
    delete(idx){
        if(idx>=this.size){
            return null;
        }
        let i=0;
        let c=this.head;
        for(;i<idx;i++){
            c=c.next;
        }
        if(c.prev){
            c.prev.next=c.next;
        }else{
            this.head=c.next;
        }
        if(c.next){
            c.next.prev=c.prev;
        }else{
            this.tail=c.prev;
        }
        this.size--;
    }
    clear(){
        this.head=null;
        this.tail=null;
        this.size=0;
    }
    print(){
        if(this.size==0){
            return "[]";
        }
        let prtStr="[";
        let i=0;
        let c=this.head;
        for(;i<this.size-1;i++){
            prtStr+=c.value;
            prtStr+=",";
            c=c.next;
        }
        prtStr+=c.value;
        prtStr+="]";
        return prtStr;  
    }
}


let quantity_option=1;

let origin_product=null;

let product_index=0;
let product_array=[];
let tracking_item_list=new LinkedList();

const market_price_cache={};
const market_price_request_cache = {};

let material_list = [];

let checkboxes={};


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



class Product {
    constructor(itemname, typeid, iconurl,industry_type, output_per_run, quantity,minimum_quantity, level, row, product_node) {
        
        this.product_index=product_index;
        product_array[product_index]=this;
        product_index++;
        
    

        //console.log("Creating "+itemname+" Panel.");
        this.itemname = itemname;
        this.typeid = parseInt(typeid);
        this.iconurl = iconurl;
        this.output_per_run = output_per_run;
        this.quantity = quantity;
        this.minimum_unit_quantity=minimum_quantity;

        this.buyprice = 0;
        this.sellprice = 0;
        this.costprice = 0;
        this.customprice = 0;

        this.eiv=getEIV(this.typeid);
        this.includedMaterials=[];

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
        this.isEndNode=level?true:false;

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
            const data = getIndustryRelation(this.typeid);
            // Process the relation data
            if (data.industry_type!=INDUSTRY_TYPE_NO_DATA && data.m.length > 0) {
                this.industry_type = data.industry_type; // Set the industry_type from the data
                const output_unit=data.q;

                this.minimum_unit_quantity=Math.ceil(this.minimum_unit_quantity/output_unit)*output_unit;

                await data.m.map(async (rel, index) => {
                    const material_material_data = getIndustryRelation(rel.i);
                    let material_industry_type=INDUSTRY_TYPE_NO_DATA;
                    if(material_material_data.industry_type!=INDUSTRY_TYPE_NO_DATA && material_material_data.m.length>0){
                        material_industry_type=material_material_data.industry_type;
                    }
                    
                    let material_quantity=(rel.q*this.quantity / data.q) * getBonusModifier(this.typeid);
                    if(material_quantity<Math.ceil(this.quantity / data.q)){
                        material_quantity=Math.ceil(this.quantity / data.q);
                    }
                    let material_minumun_unit=Math.ceil((rel.q*this.minimum_unit_quantity / data.q) * getBonusModifier(this.typeid));
                    if(material_minumun_unit<Math.ceil(this.minimum_unit_quantity / data.q)){
                        material_minumun_unit=Math.ceil(this.minimum_unit_quantity / data.q);
                    }

                    const material = new Product(
                        rel.n,
                        rel.i,
                        get_iconurl(rel.i),
                        material_industry_type,
                        data.q,
                        material_quantity,
                        material_minumun_unit,
                        this.manufacturing_level + 1,
                        index,
                        this
                    );
                    this.materials.push(material); 
                    material.includingMaterialTree(parseInt(rel.i));
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
            if(this.manufacturing_level>0){
                this.buyprice = parseFloat(data.buy);
                this.sellprice = parseFloat(data.sell);
            }
            else{
                this.buyprice = parseFloat(data.buy)*parseInt(this.quantity);
                this.sellprice = parseFloat(data.sell)*parseInt(this.quantity);
            }
            
            this.updatePanel();
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
    }

    // Method to calculate custom price based on materials
    async calcCost(calcFromOverallTree=false) {
        if (this.materials.length === 0) {
            this.costprice = 0;
        } else {
            let total = 0;
            for(const material of this.materials){
                if (material.pricetype === PRICETYPE_BUY) {
                    total += material.buyprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_SELL) {
                    total += material.sellprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_COST) {
                    await material.calcCost(); // Calculate the custom price for the material
                    total += material.costprice * material.getQuantity();
                } else if (material.pricetype === PRICETYPE_CUSTOM) {
                    total += material.customprice * material.getQuantity();
                }

            }
            const savedBonus=localStorage.getItem(this.typeid);
            let index;
            let structureBonus;
            let tax;
            if(savedBonus){
                index=savedBonus.index[this.industry_type];
                structureBonus=savedBonus.costBonus;
                tax=savedBonus.tax;
            }
            else{
                if(this.industry_type==INDUSTRY_TYPE_REACTION){
                    index = document.getElementById("reaction-system-index").value;
                    structureBonus = 0;
                    tax = document.getElementById("reaction-tax").value;
                }else if(CONSTRUCTION_COMPONENTS.includes(this.typeid) || CAPITAL_CONSTRUCTION_COMPONENTS.includes(this.typeid)){
                    index = document.getElementById("component-system-index").value;
                    structureBonus = document.getElementById("component-structure-cost-bonus").value;
                    tax = document.getElementById("component-tax").value;
                }else if(FUEL_BLOCKS.includes(this.typeid)){
                    index = document.getElementById("fuel-system-index").value;
                    structureBonus = document.getElementById("fuel-structure-cost-bonus").value;
                    tax = document.getElementById("fuel-tax").value;
                }else{
                    index = document.getElementById("manufacturing-system-index").value;
                    structureBonus = document.getElementById("manufacturing-structure-cost-bonus").value;
                    tax = document.getElementById("manufacturing-tax").value;
                }                
            }
            const blueprintdata=getIndustryRelation(this.typeid);
            const jobcost=getJobCost(this.eiv,index,structureBonus,tax,(blueprintdata.industry_type==INDUSTRY_TYPE_NO_DATA?1:blueprintdata.q));
            if(this.manufacturing_level) this.costprice = (total/this.getQuantity())+jobcost;
            else this.costprice = total+(jobcost*(blueprintdata.industry_type==INDUSTRY_TYPE_NO_DATA?1:blueprintdata.q));
        }
        this.updatePanel();
    }
    async loadAndCalcCost(){


        const promises=this.materials.map( async(material)=>{
            await material.getMarketPrices();
        });
        // Wait for all prices to be fetched and calculate the custom price for the original product
        await Promise.all(promises);
        if(!this.isEndNode && this.manufacturing_level>0){
            this.pricetype=PRICETYPE_COST;
            this.updatePanel;
        }
        origin_product.calcCost();
        displayTotalMaterials();
        

    }
    getPrice(){
        if(this.pricetype===PRICETYPE_BUY){
            return parseFloat(this.buyprice);
        }
        else if(this.pricetype===PRICETYPE_SELL){
            return parseFloat(this.sellprice);
        }
        else if(this.pricetype===PRICETYPE_COST){
            return parseFloat(this.costprice);
        }
        else if(this.pricetype===PRICETYPE_CUSTOM){
            return parseFloat(this.customprice);
        }
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

    getQuantity(quantityOption=quantity_option){
        
        if(quantityOption===QUANTITY_OPTION_MATERIAL){
            if(this.minimum_unit_quantity){return this.minimum_unit_quantity;}
            else{return this.quantity;}
        }
        else if(quantityOption===QUANTITY_OPTION_PRICE){
           
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
        itemIconCell.classList.add('color-group');
        itemIconCell.addEventListener("click",()=>{
            this.selectPanel();
        });

        // Item Name Area
        itemNameCell.textContent = Math.ceil(this.getQuantity()).toString()+" x "+ this.itemname;
        itemNameCell.classList.add('product-name');
        itemNameCell.classList.add('color-group');
        itemNameCell.addEventListener("click",()=>{
            this.selectPanel();
        });
        

        // Setting Icon Area
        settingIconCell.classList.add('product-setting');
        settingIconCell.classList.add('color-group');
        const settingIcon = document.createElement('img');
        settingIcon.src = BONUS_SETTING_ICON_URL; // Replace with actual setting icon URL
        settingIcon.alt = 'Settings';
        settingIcon.classList.add('setting-icon');
        //settingIconCell.appendChild(settingIcon);
        settingIconCell.textContent=""

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
        buyRadio.id = 'radio-buy';
        buyRadio.value = 1;
        buyRadio.checked = (this.pricetype === PRICETYPE_BUY);
        buyRadio.addEventListener('click',async ()=>{
            const selectedRadio=this.table_panel.querySelector(`input[name="price-type-${this.product_index}"]:checked`);
            this.pricetype=parseInt(selectedRadio.value);
            await changeAllPriceType(this.typeid,PRICETYPE_BUY);
            origin_product.calcCost();
            displayTotalMaterials();
        });

        buyRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_BUY && this.manufacturing_level));
        buyRadioCell.appendChild(buyRadio);
        buyRow.appendChild(buyLabelCell);
        buyRow.appendChild(buyPriceCell);
        if(this.manufacturing_level){
            buyRow.appendChild(buyRadioCell);
        }
        else{
            const buttonBuyMaterialsCell=document.createElement('td');
            const buttonBuyMaterials=document.createElement('button');
            buttonBuyMaterials.setAttribute('id','button-buy-materials');
            buttonBuyMaterials.classList.add('buy-materials');
            buttonBuyMaterials.textContent="C";
            buttonBuyMaterials.addEventListener('click',()=>{
                this.changeEndMaterialsPricetype(PRICETYPE_BUY);
            });
            buttonBuyMaterialsCell.appendChild(buttonBuyMaterials);
            buyRow.appendChild(buttonBuyMaterials);
        }

        const sellRow = document.createElement('tr');
        sellRow.setAttribute('id','tr-sell-price');
        sellRow.classList.add('sell-row');

        const sellLabelCell = document.createElement('td');
        sellLabelCell.classList.add('sell-label');
        const sellPriceCell = document.createElement('td');
        sellPriceCell.classList.add('sell-price');
        const sellRadioCell = document.createElement('td');
        sellRadioCell.classList.add('sell-radio');
        sellLabelCell.textContent = 'Sell:';
        sellPriceCell.textContent = this.sellprice.toFixed(2);
        sellPriceCell.setAttribute('id','td-sell-price');
        const sellRadio = document.createElement('input');
        sellRadio.type = 'radio';
        sellRadio.name = `price-type-${this.product_index}`;
        sellRadio.id = 'radio-sell';
        sellRadio.value = 2;
        sellRadio.checked = (this.pricetype === PRICETYPE_SELL);
        sellRadio.addEventListener('click',async ()=>{
            const selectedRadio=this.table_panel.querySelector(`input[name="price-type-${this.product_index}"]:checked`);
            this.pricetype=parseInt(selectedRadio.value);
            await changeAllPriceType(this.typeid,PRICETYPE_SELL);
            origin_product.calcCost();
            displayTotalMaterials();
        });

        sellRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_SELL && this.manufacturing_level));
        sellRadioCell.appendChild(sellRadio);
        sellRow.appendChild(sellLabelCell);
        sellRow.appendChild(sellPriceCell);
        if(this.manufacturing_level){
            sellRow.appendChild(sellRadioCell);
        }
        else{
            const buttonSellMaterialsCell=document.createElement('td');
            const buttonSellMaterials=document.createElement('button');
            buttonSellMaterials.setAttribute('id','button-sell-materials');
            buttonSellMaterials.classList.add('sell-materials');
            buttonSellMaterials.textContent="C";
            buttonSellMaterials.addEventListener('click',()=>{
                this.changeEndMaterialsPricetype(PRICETYPE_SELL);
            });
            buttonSellMaterialsCell.appendChild(buttonSellMaterials);
            sellRow.appendChild(buttonSellMaterials);
        }

        const costRow = document.createElement('tr');
        costRow.setAttribute('id','tr-cost-price');
        costRow.classList.add('cost-row');

        const costLabelCell = document.createElement('td');
        costLabelCell.classList.add('cost-label');
        const costPriceCell = document.createElement('td');
        costPriceCell.classList.add('cost-price');
        const costRadioCell = document.createElement('td');
        costRadioCell.classList.add('cost-radio');
        costLabelCell.textContent = 'Cost:';
        costPriceCell.textContent = this.costprice.toFixed(2);
        costPriceCell.setAttribute('id','td-cost-price');
        const costRadio = document.createElement('input');
        costRadio.type = 'radio';
        costRadio.name = `price-type-${this.product_index}`;
        costRadio.id = 'radio-cost';
        costRadio.value = 3;
        costRadio.checked = (this.pricetype === PRICETYPE_COST);

        costRadio.addEventListener('click',async ()=>{
            const selectedRadio=this.table_panel.querySelector(`input[name="price-type-${this.product_index}"]:checked`);
            this.pricetype=parseInt(selectedRadio.value);
            await changeAllPriceType(this.typeid,PRICETYPE_COST);
            origin_product.calcCost();
            displayTotalMaterials();
        });

        costRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_COST && this.manufacturing_level));
        costRadioCell.appendChild(costRadio);
        costRow.appendChild(costLabelCell);
        costRow.appendChild(costPriceCell);
        if(this.manufacturing_level)costRow.appendChild(costRadioCell);

        const customRow = document.createElement('tr');
        customRow.setAttribute('id','tr-custom-price');
        customRow.classList.add('custom-row');

        const customPriceInputCell = document.createElement('td');
        customPriceInputCell.classList.add('custom-input-cell');
        const customRadioCell = document.createElement('td');
        customRadioCell.classList.add('custom-radio');
        const customPriceInput = document.createElement('input');
        customPriceInput.type = 'number';
        customPriceInput.min = 0;
        customPriceInput.step = 0.01;
        customPriceInput.value = this.customprice;
        customPriceInput.classList.add('custom-price-input');
        customPriceInput.setAttribute('id',`input-custom-price-${this.product_index}`);

        customPriceInput.addEventListener('input', async()=>{
            this.pricetype=PRICETYPE_CUSTOM;
            this.customprice=parseFloat(customPriceInput.value);
            await changeAllPriceType(this.typeid,PRICETYPE_CUSTOM,parseInt(customPriceInput.value));
            origin_product.calcCost();
            displayTotalMaterials();
        });

        customPriceInputCell.colSpan = 2;
        customPriceInputCell.setAttribute('id','td-custom-price');
        customPriceInputCell.appendChild(customPriceInput);
        const customRadio = document.createElement('input');
        customRadio.type = 'radio';
        customRadio.name = `price-type-${this.product_index}`;
        customRadio.id = 'radio-custom';
        customRadio.value = 0;
        customRadio.checked = (this.pricetype===PRICETYPE_CUSTOM);
        customRadio.addEventListener('click',async ()=>{
            const selectedRadio=this.table_panel.querySelector(`input[name="price-type-${this.product_index}"]:checked`);
            this.pricetype=parseInt(selectedRadio.value);
            await changeAllPriceType(this.typeid,PRICETYPE_CUSTOM,this.customprice);
            origin_product.calcCost();
            displayTotalMaterials();
        });

        customRow.classList.toggle("hidden-data",(this.pricetype!=PRICETYPE_CUSTOM || !this.manufacturing_level));
        customRadioCell.appendChild(customRadio);
        customRow.appendChild(customPriceInputCell);
        if(this.manufacturing_level)customRow.appendChild(customRadioCell);


        priceTable.appendChild(buyRow);
        priceTable.appendChild(sellRow);
        priceTable.appendChild(costRow);
        priceTable.appendChild(customRow);
        
        priceTableCell.appendChild(priceTable);
        
        const nextTreeCell = document.createElement('td');

        const nextTreeButton = document.createElement('button');
        const closeTreeButton = document.createElement('button');
        nextTreeButton.textContent = '>';
        nextTreeButton.classList.add('next-tree');
        nextTreeButton.setAttribute('id',`button-open-tree-${this.product_index}`);
        nextTreeButton.addEventListener('click',()=>{
            this.openNextTree();
            nextTreeButton.classList.add('hidden-data');
            closeTreeButton.classList.remove('hidden-data');   
        });
        closeTreeButton.textContent = '<';
        closeTreeButton.classList.add('close-tree');
        closeTreeButton.classList.add('hidden-data');
        closeTreeButton.setAttribute('id',`button-close-tree-${this.product_index}`);
        closeTreeButton.addEventListener('click',()=>{
            this.closeTree(true);
            nextTreeButton.classList.remove('hidden-data');
            closeTreeButton.classList.add('hidden-data'); 
        });

        if(this.industry_type!=INDUSTRY_TYPE_NO_DATA && this.manufacturing_level){
            nextTreeCell.appendChild(nextTreeButton);
            nextTreeCell.appendChild(closeTreeButton);
        }
        
        row2.appendChild(priceTableCell);
        row2.appendChild(nextTreeCell);

        this.table_panel=document.createElement('table');
        this.table_panel.classList.add('product-table-panel');
        this.table_panel.classList.toggle("hidden-data",!this.visibility);

        this.table_panel.appendChild(row1);
        this.table_panel.appendChild(row2);

        const manufacturing_board=document.getElementById("product-panel-lv"+this.manufacturing_level);
        
        manufacturing_board.appendChild(this.table_panel);
        this.showPanel();

    }

    async updatePanel(){


        this.table_panel.classList.toggle("hidden-data",!this.visibility);

        

        const tdItemName=this.table_panel.querySelector(".product-name");
        const tdBuyPrice=this.table_panel.querySelector("#td-buy-price");
        const tdSellPrice=this.table_panel.querySelector("#td-sell-price");
        const tdCostPrice=this.table_panel.querySelector("#td-cost-price");



        tdItemName.textContent = Math.ceil(this.getQuantity()).toLocaleString()+"x "+ this.itemname;
        tdBuyPrice.textContent = parseFloat(this.buyprice.toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2,maximumFractionDigits: 2});
        tdSellPrice.textContent = parseFloat(this.sellprice.toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2,maximumFractionDigits: 2});
        tdCostPrice.textContent = parseFloat(this.costprice.toFixed(2)).toLocaleString('en-US', {minimumFractionDigits: 2,maximumFractionDigits: 2});
        
        this.table_panel.classList.toggle("opened-panel",this.opened);
        this.table_panel.classList.toggle("selected-panel",this.selected);
        this.table_panel.classList.toggle("endnode-panel",this.isEndNode);


        if(this.manufacturing_level){
            const buyRadio=this.table_panel.querySelector("#radio-buy");
            const sellRadio=this.table_panel.querySelector("#radio-sell");
            const costRadio=this.table_panel.querySelector("#radio-cost");
            const customRadio=this.table_panel.querySelector("#radio-custom");
            buyRadio.checked = (this.pricetype === PRICETYPE_BUY);
            sellRadio.checked = (this.pricetype === PRICETYPE_SELL);
            costRadio.checked = (this.pricetype === PRICETYPE_COST);
            customRadio.checked = (this.pricetype === PRICETYPE_CUSTOM);
        }


        this.openPriceTable();
        

    }
    async openPriceTable(selected=this.selected){

        if(this.manufacturing_level===0){
            this.table_panel.querySelector("#tr-buy-price").classList.toggle("hidden-data",false);
            this.table_panel.querySelector("#tr-sell-price").classList.toggle("hidden-data",false);
            this.table_panel.querySelector("#tr-cost-price").classList.toggle("hidden-data",false);
            this.table_panel.querySelector("#tr-custom-price").classList.toggle("hidden-data",true);
            return;
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
            this.table_panel.querySelector("#tr-cost-price").classList.toggle("hidden-data",false);
        if(this.pricetype===PRICETYPE_CUSTOM)
            this.table_panel.querySelector("#tr-custom-price").classList.toggle("hidden-data",false);
    }

    async openNextTree(calcCost=true){
        /*
        if(this.manufacturing_level){
            this.product_node.materials.forEach(material=>{
                material.closeTree();
            });
        }        

        this.opened=true;
        this.selectPanel();

        //console.log("Opening "+this.itemname+"...");
        if(!this.industry_type==INDUSTRY_TYPE_NO_DATA){
            return;
        }*/
        if(this.materials.length==0 && !NO_BLUEPRINT.has(this.typeid)){
            await this.setMaterials();


            if(calcCost){
                this.loadAndCalcCost();
            }
            
        }

        this.isEndNode=(this.materials.length==0);
        /*
        if(!this.isEndNode){
            this.pricetype=PRICETYPE_COST;
        }
        if(this.materials.length>0 ){
            const openTreeButton=this.table_panel.querySelector(`#button-open-tree-${this.product_index}`);
            const closeTreeButton=this.table_panel.querySelector(`#button-close-tree-${this.product_index}`);
            if(openTreeButton){
                openTreeButton.classList.add("hidden-data");
            }
            if(closeTreeButton){
                closeTreeButton.classList.remove("hidden-data");
            }
    
            //await this.sortMaterials();
            await this.updatePanel();
            if(calcCost){
                tracking_item_list.clear();
                displayTotalMaterials();
                
            }
            
            
            this.materials.forEach(material=>{
                material.showPanel(true);
            });
        }
            */

    }

    async closeTree(closingMaterial=false,isCalledByCloseAllMaterialTree=false,updateDisplay=true){
        this.opened=false;
        

        this.materials.forEach(material=>{
            material.showPanel(false);
            material.opened=false;
            material.closeTree();
        });

        const openTreeButton=this.table_panel.querySelector(`#button-open-tree-${this.product_index}`);
        const closeTreeButton=this.table_panel.querySelector(`#button-close-tree-${this.product_index}`);
        if(openTreeButton){
            openTreeButton.classList.remove("hidden-data");
        }
        if(closeTreeButton){
            closeTreeButton.classList.add("hidden-data");
        }

        if(closingMaterial){
            if(!isCalledByCloseAllMaterialTree){
                closeAllMaterialTree(this.typeid);
            }
            this.isEndNode=true;
            if(updateDisplay){
                displayTotalMaterials();
            }
            
        }
        this.updatePanel();
    }
    async changeEndMaterialsPricetype(pricetype){
        
        for( const material of this.materials){
            if(material.isEndNode){
                material.pricetype=pricetype;
                material.updatePanel();
            }
            else{
                await material.changeEndMaterialsPricetype(pricetype);
            }
        }
        this.calcCost();
        displayTotalMaterials();
    }

    async selectPanel(){

        if(this.manufacturing_level==0){
            this.openPriceTable(true);
            return;
        }
        for (const materials of this.product_node.materials){
            materials.selected=false;
            materials.openPriceTable(false);
        }
        this.selected=true;
        this.openPriceTable();
        //console.log("Panel " +this.itemname+" is selected.");
        

    }
    async showPanel(v=this.visibility){
        this.visibility=v;
        if(this.manufacturing_level==0){
            return;
        }
        this.updatePanel();
            
    }
    async includingMaterialTree(typeid){
        
        if(!this.includedMaterials.includes(parseInt(typeid))){       
            this.includedMaterials.push(parseInt(typeid));
        }
        if(this.manufacturing_level){
            this.product_node.includingMaterialTree(typeid);
        }
    }
}




async function loadMarketDataWithCache(typeId) {
    const int_typeId = parseInt(typeId);

    // Check if the response is already cached
    if (market_price_cache[int_typeId]) {
        return market_price_cache[int_typeId];
    }

    // Check if there's an ongoing request for the same typeId
    if (market_price_request_cache[int_typeId]) {
        return await market_price_request_cache[int_typeId];
    }

    // Store the ongoing request in the request cache
    market_price_request_cache[int_typeId] = (async () => {
        try {
            const response = await fetch(`https://lindows.kr:8009/api/jitaprice?type_id=${typeId}`);
            const data = await response.json();
            market_price_cache[int_typeId] = data;
            console.log(`Market price has been loaded. typeId: ${typeId}`);
            return data;
        } finally {
            // Remove the request from the request cache once completed
            delete market_price_request_cache[int_typeId];
            if(Object.keys(market_price_request_cache).length === 0){
                console.log(`Market data loading finished`);
                origin_product.loadAndCalcCost();
                calcTotalMaterials();
            }
            else{
                console.log(`Left market data queue : ${Object.keys(market_price_request_cache).length}`);
            }
        }
    })();

    // Await the ongoing request and return its result
    return await market_price_request_cache[int_typeId];
}


function getEIV(type_id) {
    data = getIndustryRelation(type_id);
    let eiv = 0;
    if (data.industry_type != INDUSTRY_TYPE_NO_DATA) {
        data.m.map((material) => {
            const adjustedPrice = eivData[material.i] ? eivData[material.i].adjusted_price : 0;
            eiv += material.q * adjustedPrice;
        });
    }
    return eiv || 0;
}


 


//
async function runCalculate(){
    
    origin_product=null;
    product_index = 0;
    product_array=[];
    
    document.getElementById("product-panel-lv0").innerHTML="";
    document.getElementById("total-materials").innerHTML="";
    document.getElementById("td-export-button").innerHTML="";
    document.getElementById("product-panel-lv1").innerHTML="";
    document.getElementById("product-panel-lv2").innerHTML="";
    document.getElementById("product-panel-lv3").innerHTML="";
    document.getElementById("product-panel-lv4").innerHTML="";
    document.getElementById("product-panel-lv5").innerHTML="";
    document.getElementById("product-panel-lv6").innerHTML="";
    document.getElementById("product-panel-lv7").innerHTML="";
    document.getElementById("product-panel-lv8").innerHTML="";
    document.getElementById("product-panel-lv9").innerHTML="";
    document.getElementById("product-panel-lv10").innerHTML="";




    const inputBlueprint= document.querySelector('input[list="blueprint-options"]');
    const inputBlueprintRun=document.querySelector('#blueprint-run-input');
    const blueprintOptions = document.getElementById("blueprint-options");
    const selectedOption = Array.from(blueprintOptions.options).find(option => option.value === inputBlueprint.value);

    const selectedCalculatorRadio = document.querySelector('input[name="calculate-type"]:checked');
    quantity_option=parseInt(selectedCalculatorRadio.value);

    

    let typeId=0;
    
    if(selectedOption){
        typeId=selectedOption.getAttribute("data-type_id");
    }
    else{
        console.error("Cannot found matching blueprint.");
        showNotification("Cannot found matching blueprint.");
        return;
    }
    
    const data = getIndustryRelation(typeId);
    let industry_type = data.industry_type;

    origin_product=new Product(
        inputBlueprint.value,
        typeId,
        get_iconurl(typeId),
        industry_type,
        data.q,
        inputBlueprintRun.value*data.q,
        inputBlueprintRun.value*data.q,
        0,
        null,
        0
    )

    await origin_product.openNextTree();
    origin_product.openPriceTable();

    const openButton=document.getElementById("open-button");
    openButton.addEventListener("click",async ()=>{


        checkboxes={
            basement:null,
            component:null,
            reaction:null,
            fuel:null,
            pi:null
        };
        checkboxes["basement"]=document.querySelector("#basement-checkbox:checked");
        checkboxes["component"]=document.querySelector("#component-checkbox:checked");
        checkboxes["reaction"]=document.querySelector("#reaction-checkbox:checked");
        checkboxes["composite"]=document.querySelector("#reaction-checkbox1:checked");
        checkboxes["intermediate"]=document.querySelector("#reaction-checkbox2:checked");
        checkboxes["biochemical"]=document.querySelector("#reaction-checkbox3:checked");
        checkboxes["molecular_forged"]=document.querySelector("#reaction-checkbox4:checked");
        checkboxes["fuel"]=document.querySelector("#fuel-checkbox:checked");
        checkboxes["pi"]=document.querySelector("#pi-checkbox:checked");

        await openFollowingTree(origin_product);
        await origin_product.loadAndCalcCost();
        displayTotalMaterials();
    });

    const button_copyMaterials=document.createElement("button");
    button_copyMaterials.textContent="📋Copy";
    button_copyMaterials.classList.add('copy-button');

    button_copyMaterials.addEventListener("click",()=>{
        copyMaterialsToClipboard("materials");
    });

    const button_copyBreakdownMaterials=document.createElement("button");
    button_copyBreakdownMaterials.textContent="Sheet";
    button_copyBreakdownMaterials.classList.add('copy-button');
    button_copyBreakdownMaterials.addEventListener("click",()=>{
        showBreakdownPopup();
    });
    
    const td_buttonArea=document.getElementById("td-export-button");
    td_buttonArea.appendChild(button_copyMaterials);
    td_buttonArea.appendChild(button_copyBreakdownMaterials);



    

}

async function openFollowingTree(product){

    for( const node of product.materials){
        if(NO_BLUEPRINT.has(node.typeid)){
            continue;
        }else if(CONSTRUCTION_COMPONENTS.includes(node.typeid) || CAPITAL_CONSTRUCTION_COMPONENTS.includes(node.typeid)){
            if(checkboxes["component"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    await delay(1);
                }
                await openFollowingTree(node);
            }else {
                node.closeTree(true,false,false);
                continue;
            }
                
        }else if(COMPOSITE.includes(node.typeid)){
            if(checkboxes["composite"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    await delay(1);
                }
                await openFollowingTree(node);
            }else {
                node.closeTree(true,false,false);
                continue;
            }
        }else if(INTERMEDIATE_MATERIALS.includes(node.typeid)){
            if(checkboxes["intermediate"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    await delay(1);
                }
                await openFollowingTree(node);
            }else {
                node.closeTree(true,false,false);
                continue;
            }
        }else if(BIOCHEMICAL_MATERIALS.includes(node.typeid)){
            if(checkboxes["biochemical"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    await delay(1);
                }
                await openFollowingTree(node);
            }else {
                node.closeTree(true,false,false);
                continue;
            }
        }else if(MOLECULAR_FORGED_MATERIALS.includes(node.typeid)){
            if(checkboxes["molecular_forged"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    await delay(1);
                }
                await openFollowingTree(node);
            }else {
                node.closeTree(true,false,false);
                continue;
            }
        }else if(FUEL_BLOCKS.includes(node.typeid)){
            if(checkboxes["fuel"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    await delay(1);
                }
                await openFollowingTree(node);
            }else {
                node.closeTree(true,false,false);
                continue;
            }
        } else{
            if(checkboxes["basement"]){
                await node.openNextTree(false);
                if(node.manufacturing_level%2){
                    //await delay(1);
                }
                await openFollowingTree(node);
            }else {
                await node.closeTree(true,false,false);
                continue;
            }   
        }
        
    }
    console.log(new Date().getMilliseconds()+ product.itemname);
    await delay(200);
    
    if(product.product_index==0){
        origin_product.calcCost();
        //displayTotalMaterials();
    }
}

async function changeAllPriceType(typeId,pricetype,customPrice=0){
    displayTotalMaterials();
    await changeFollowingPriceType(typeId,pricetype,origin_product,customPrice);
}
async function changeFollowingPriceType(typeId,pricetype,productNode,customPrice=0){
    if(productNode.typeid==typeId){
        productNode.pricetype=pricetype;
        if(pricetype==PRICETYPE_CUSTOM){
            const customInput=productNode.table_panel.querySelector(`#input-custom-price-${productNode.product_index}`);
            if(customInput){
                productNode.customprice=customPrice;
                customInput.value=customPrice;
                
            }
        }
        productNode.updatePanel();
    }
    for (const material of productNode.materials) {
        await changeFollowingPriceType(typeId, pricetype, material,customPrice);
    }

}

async function closeAllMaterialTree(typeId){
    await closeFollowingMaterialTree(typeId,origin_product);
}
async function closeFollowingMaterialTree(typeId,productNode){
    if(productNode.typeid==typeId){
        productNode.closeTree(true,true);
        productNode.updatePanel();
    }
    for (const material of productNode.materials) {
        await closeFollowingMaterialTree(typeId, material);
    }

}


async function calcTotalMaterials(saveGlobal=true) {

    const materialList=[];
    if(quantity_option===QUANTITY_OPTION_PRICE){

        function addMaterials(node) {
            if (node.isEndNode || node.materials.length === 0) {
                let idx = materialList.findIndex(item => item.id === node.typeid);
                if (idx !== -1) {
                    materialList[idx].quantity += node.getQuantity();
                } else {
                    
                    materialList.push({
                        id: node.typeid,
                        name: node.itemname,
                        icon: node.iconurl,
                        quantity: node.getQuantity()
                    });
                }
            } else {
                for (const material of node.materials) {
                    addMaterials(material);
                }
            }
        }
    
        addMaterials(origin_product);
    }else if (quantity_option===QUANTITY_OPTION_MATERIAL){

        const endNode_list=[];

        const materialList_for_unit_calculating=[];

        const rawMaterials=[];

        //initialise
        materialList_for_unit_calculating.push({
            [origin_product.typeid]:{
                "0":[origin_product.quantity,origin_product]
            }
        });
        for(let i=1;i<MAX_TREE_DEPTH;i++){
            materialList_for_unit_calculating.push({});
        }


        function queueMaterial(product,material){
            let idx=null;
            for(let i=MAX_TREE_DEPTH-1;i>=material.manufacturing_level;i--){
                if(materialList_for_unit_calculating[i][material.typeid]!=undefined){
                    idx=i
                }
            }
            if(idx===null){
                idx=material.manufacturing_level;
                if(!materialList_for_unit_calculating[idx]){
                    materialList_for_unit_calculating[idx]={};
                }
                materialList_for_unit_calculating[idx][material.typeid]={
                    [product.typeid]:[0,material]
                }
            }
            else{
                if(!materialList_for_unit_calculating[idx][material.typeid][product.typeid]){
                    materialList_for_unit_calculating[idx][material.typeid][product.typeid]=[0,material];
                }else{
                    materialList_for_unit_calculating[idx][material.typeid][product.typeid].push(material);
                }
            }
            for(let i=0;i<material.manufacturing_level;i++){
                if(materialList_for_unit_calculating[i][material.typeid]){
                    for(const key in materialList_for_unit_calculating[i][material.typeid]){
                        if(materialList_for_unit_calculating[idx][material.typeid][key]){
                            materialList_for_unit_calculating[i][material.typeid][key].forEach(m=>{
                                materialList_for_unit_calculating[idx][material.typeid][key].push(m);
                            });
                            
                        }else{
                            materialList_for_unit_calculating[idx][material.typeid][key]=[0];
                            materialList_for_unit_calculating[i][material.typeid][key].forEach(m=>{
                                materialList_for_unit_calculating[idx][material.typeid][key].push(m);
                            });
                            
                        }
                    }
                    delete materialList_for_unit_calculating[i][material.typeid]

                }
            }
        }

        function getNeededQuantity(typeId){
            let sum=0;
            for(let i=0;i<MAX_TREE_DEPTH;i++){
                for( const material_id in materialList_for_unit_calculating[i]){
                    if(material_id==typeId){
                        for(const product_id in materialList_for_unit_calculating[i][material_id]){
                            sum+=materialList_for_unit_calculating[i][material_id][product_id][0];
                        }
                    }
                }
            }
            return sum;
        }
        function addToEndNode(node){

            

            if(!endNode_list.includes(parseInt(node.product_index))){

                endNode_list.push(parseInt(node.product_index));
                
            }
            node.materials.forEach(m=>{
                addToEndNode(m);
            });
        }


        product_array.forEach(p=>{
            if(p.isEndNode){
                addToEndNode(p);
            }
        });
        product_array.forEach(p=>{
            if(!endNode_list.includes(parseInt(p.product_index))){
                p.materials.forEach(m=>{
                    queueMaterial(p,m);
                })
            }
            
            else{
                let notIncluded=true;
                rawMaterials.forEach(m=>{
                    if(m.id==p.typeid){
                        notIncluded=false;
                    }
                });
                if(notIncluded){
                    rawMaterials.push({
                        id:p.typeid,
                        name:p.itemname,
                        icon:p.iconurl
                    });
                }
            }
        });

        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for(const material_id in materialList_for_unit_calculating[i]){
                for(const product_id in materialList_for_unit_calculating[i][material_id]){
                    if(product_id>0){
                        let sumOfQuantity=0;
                        const bpData= getIndustryRelation(product_id);
                        let materialQuantity;
                        bpData.m.forEach(info=>{
                            if(info.i==material_id){
                                materialQuantity=info.q;
                            }
                        });
                        let neededQuantity=getNeededQuantity(product_id);
                        sumOfQuantity=Math.ceil(Math.ceil(neededQuantity/bpData.q)*materialQuantity * getBonusModifier(product_id));
                        if(sumOfQuantity<Math.ceil(neededQuantity/bpData.q)){
                            sumOfQuantity=Math.ceil(neededQuantity/bpData.q);
                        }

                        materialList_for_unit_calculating[i][material_id][product_id][0]=sumOfQuantity;
    
                        let temporarySum=0;
                        for(let j=1;j<materialList_for_unit_calculating[i][material_id][product_id].length;j++){
                            temporarySum+=materialList_for_unit_calculating[i][material_id][product_id][j].quantity;
                        }
                        for(let j=1;j<materialList_for_unit_calculating[i][material_id][product_id].length;j++){
                            materialList_for_unit_calculating[i][material_id][product_id][j].minimum_unit_quantity=sumOfQuantity*materialList_for_unit_calculating[i][material_id][product_id][j].quantity/temporarySum;    
                        }
                    }
                }
            }
        }

        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for( const material_id in materialList_for_unit_calculating[i]){
                let rmidx=-1;
                for(let j=0;j<rawMaterials.length;j++){
                    if(rawMaterials[j].id==parseInt(material_id)){
                        rmidx=j;
                        break;
                    }
                }
                if(rmidx!=-1){
                    for( const product_id in materialList_for_unit_calculating[i][material_id]){
                        let idx = materialList.findIndex(item => item.id === material_id);
                        if (idx !== -1) {
                            materialList[idx].quantity += materialList_for_unit_calculating[i][material_id][product_id][0];
                        } else {
                            materialList.push({
                                id: material_id,
                                name: rawMaterials[rmidx].name,
                                icon: rawMaterials[rmidx].icon,
                                quantity: materialList_for_unit_calculating[i][material_id][product_id][0]
                            });
                        }

                    }
                }

            }
        }
    }

    materialList.sort((a, b) => b.quantity - a.quantity); // Sort by quantity DESC

    if(saveGlobal){
        material_list=materialList;
    }

    return materialList;
}

async function displayTotalMaterials(){
    
    const materialList=await calcTotalMaterials();

    const table_total = document.createElement('table');
    table_total.classList.add('total-item');
    materialList.forEach(m => {
        const tr_total = document.createElement('tr');

        const td_totalIcon = document.createElement('td');
        td_totalIcon.classList.add('total-item-icon');

        const img_totalIcon = document.createElement('img');
        img_totalIcon.src = m.icon;
        img_totalIcon.classList.add('total-item-icon');

        const td_totalItemname = document.createElement('td');
        td_totalItemname.classList.add('total-item-itemname');
        td_totalItemname.textContent = m.name;

        const td_totalQuantity = document.createElement('td');
        const span_totalQuantity=document.createElement('span');
        const div_totalQuantityPopup=document.createElement('div');

        td_totalQuantity.classList.add('total-item-quantity');
        span_totalQuantity.classList.add('total-item-quantity');
        div_totalQuantityPopup.classList.add('price-popup','hidden-data');
    
        span_totalQuantity.textContent = Math.ceil(m.quantity).toLocaleString();
        td_totalQuantity.appendChild(span_totalQuantity);


        const _price=getMaterialPrice(m.id);
        div_totalQuantityPopup.innerHTML = 
        Math.ceil(m.quantity).toLocaleString() + " x " + 
        _price.toLocaleString() + ' ISK' + 
        '<br>\n' +
        parseFloat(
            (
                Math.ceil(m.quantity) * _price
            ).toFixed(2)
        ).toLocaleString() + ' ISK';
        
        td_totalQuantity.addEventListener('mouseover', (e) => {

            
            div_totalQuantityPopup.style.left = e.pageX + 'px';
            div_totalQuantityPopup.style.top = (e.pageY-50)+ 'px';
            div_totalQuantityPopup.classList.remove('hidden-data');
        });
        
        td_totalQuantity.addEventListener('mouseout', (e) => {
            div_totalQuantityPopup.classList.add('hidden-data');
        });
    


        td_totalIcon.appendChild(img_totalIcon);

        tr_total.appendChild(td_totalIcon);
        tr_total.appendChild(td_totalItemname);
        tr_total.appendChild(td_totalQuantity);
        tr_total.appendChild(div_totalQuantityPopup);

        if(tracking_item_list.find(parseInt(m.id))!=-1){
            tr_total.classList.add('has-material-highlighted');
        }

        tr_total.addEventListener('mouseover', ()=>{
            
            tr_total.classList.add("has-material-highlighted");
            product_array.forEach(p=>{
                if(p.includedMaterials.includes(parseInt(m.id))){
                    p.table_panel.classList.add("has-material-highlighted");
                }   
            });
        })
        tr_total.addEventListener('mouseout', ()=>{
            if(tracking_item_list.find(parseInt(m.id))==-1){
                tr_total.classList.remove("has-material-highlighted");
                product_array.forEach(p=>{
                    if(p.includedMaterials.includes(parseInt(m.id))){
                        let offHighlight=true;
                        for(let i=0;i<tracking_item_list.size;i++){
                            if(p.includedMaterials.includes(tracking_item_list.get(i))){
                                offHighlight=false;
                                break;
                            }        
                        }
                        if(offHighlight){
                            p.table_panel.classList.remove("has-material-highlighted");
                        }
                        
                    }   
                });
            }
        })
        tr_total.addEventListener('click', ()=>{
            toggleTracking(m.id);
        })

        table_total.appendChild(tr_total);
    });

    const td_totalBoard=document.getElementById("total-materials");
    td_totalBoard.innerHTML="";

    td_totalBoard.appendChild(table_total);
}

async function calcMaterialBreakdown(breakdownFuelblocks=false) {

    const materialBreakdownList=[];
    const materialList=[];
    const endNode_list=[];
    const exception_list=[];
    const materialList_for_unit_calculating=[];
    const rawMaterials=[];

    const highest_manufacturing_level=[];
    
    let maxDepth=0;

    function queueMaterial(product,material){
        let idx=null;
        for(let i=MAX_TREE_DEPTH-1;i>=material.manufacturing_level;i--){
            if(materialList_for_unit_calculating[i][material.typeid]!=undefined){
                idx=i
            }
        }
        if(idx===null){
            idx=material.manufacturing_level;
            if(!materialList_for_unit_calculating[idx]){
                materialList_for_unit_calculating[idx]={};
            }
            materialList_for_unit_calculating[idx][material.typeid]={
                [product.typeid]:[0,material]
            }
        }
        else{
            if(!materialList_for_unit_calculating[idx][material.typeid][product.typeid]){
                materialList_for_unit_calculating[idx][material.typeid][product.typeid]=[0,material];
            }else{
                materialList_for_unit_calculating[idx][material.typeid][product.typeid].push(material);
            }
        }
        for(let i=0;i<material.manufacturing_level;i++){
            if(materialList_for_unit_calculating[i][material.typeid]){
                for(const key in materialList_for_unit_calculating[i][material.typeid]){
                    if(materialList_for_unit_calculating[idx][material.typeid][key]){
                        materialList_for_unit_calculating[i][material.typeid][key].forEach(m=>{
                            materialList_for_unit_calculating[idx][material.typeid][key].push(m);
                        });
                        
                    }else{
                        materialList_for_unit_calculating[idx][material.typeid][key]=[0];
                        materialList_for_unit_calculating[i][material.typeid][key].forEach(m=>{
                            materialList_for_unit_calculating[idx][material.typeid][key].push(m);
                        });
                        
                    }
                }
                delete materialList_for_unit_calculating[i][material.typeid]

            }
        }
    }

    function getNeededQuantity(typeId){
        let sum=0;
        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for( const material_id in materialList_for_unit_calculating[i]){
                if(material_id==typeId){
                    for(const product_id in materialList_for_unit_calculating[i][material_id]){
                        sum+=materialList_for_unit_calculating[i][material_id][product_id][0];
                    }
                }
            }
        }
        return sum;
    }
    function addToEndNode(node){
        if(!endNode_list.includes(parseInt(node.product_index))){
            endNode_list.push(parseInt(node.product_index));
        }
        node.materials.forEach(m=>{
            addToEndNode(m);
        });
    }
    function addToException(node){
        if(!exception_list.includes(parseInt(node.product_index))){
            exception_list.push(parseInt(node.product_index));
        }
        node.materials.forEach(m=>{
            addToException(m);
        });
    }

    //New Code========================================

    product_array.forEach(p=>{
        if( p.isEndNode  
            && !endNode_list.includes(parseInt(p.product_index)))
        {
            if(!highest_manufacturing_level[parseInt(p.typeid)]){
                highest_manufacturing_level[parseInt(p.typeid)]=p.manufacturing_level;
            }
            else if(highest_manufacturing_level[parseInt(p.typeid)]<p.manufacturing_level){
                highest_manufacturing_level[parseInt(p.typeid)]=p.manufacturing_level;
            }
            if(p.manufacturing_level>=maxDepth){// Record the depth
                maxDepth=p.manufacturing_level; 
            }
            addToEndNode(p);
        }
    });
    

    for(let counti=1;counti<=maxDepth;counti++){



        //initialise
        endNode_list.length=0;
        exception_list.length=0;
        materialList.length=0;
        materialList_for_unit_calculating.length=0;
        rawMaterials.length=0;

        product_array.forEach(p=>{
            if((p.isEndNode && highest_manufacturing_level[parseInt(p.typeid)]<counti )
                && !exception_list.includes(parseInt(p.product_index)))
            {
                addToException(p);
            }

            else if(( p.materials.length==0 || p.isEndNode || p.manufacturing_level==counti|| (!breakdownFuelblocks && FUEL_BLOCKS.includes(p.typeid))) 
                && !exception_list.includes(parseInt(p.product_index)) 
                && !endNode_list.includes(parseInt(p.product_index)))
            {
                addToEndNode(p);
            }
        });

        materialList_for_unit_calculating.push({
            [origin_product.typeid]:{
                "0":[origin_product.quantity,origin_product]
            }
        });
        for(let i=1;i<MAX_TREE_DEPTH;i++){
            materialList_for_unit_calculating.push({});
        }

        //Main process
        product_array.forEach(p=>{

            if(!exception_list.includes(parseInt(p.product_index))){
                if(!endNode_list.includes(parseInt(p.product_index))){

                    p.materials.forEach(m=>{
                        queueMaterial(p,m);
                    })
                }
                else{

                    let notIncluded=true;
                    rawMaterials.forEach(m=>{
                        if(m.id==p.typeid){
                            notIncluded=false;
                        }
                    });
                    if(notIncluded){
                        rawMaterials.push({
                            id:p.typeid,
                            name:p.itemname,
                            icon:p.iconurl
                        });
                    }
                }
            }
        });

        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for(const material_id in materialList_for_unit_calculating[i]){
                for(const product_id in materialList_for_unit_calculating[i][material_id]){
                    if(product_id>0){
                        let sumOfQuantity=0;
                        const bpData= getIndustryRelation(product_id);
                        let materialQuantity;
                        bpData.m.forEach(info=>{
                            if(info.i==material_id){
                                materialQuantity=info.q;
                            }
                        });
                        let neededQuantity=getNeededQuantity(product_id);
                        sumOfQuantity=Math.ceil(Math.ceil(neededQuantity/bpData.q)*materialQuantity * getBonusModifier(product_id));
                        if(sumOfQuantity<Math.ceil(neededQuantity/bpData.q)){
                            sumOfQuantity=Math.ceil(neededQuantity/bpData.q)
                        }
                        materialList_for_unit_calculating[i][material_id][product_id][0]=sumOfQuantity;
                    }
                }
            }
        }
        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for( const material_id in materialList_for_unit_calculating[i]){
                let rmidx=-1;
                for(let j=0;j<rawMaterials.length;j++){
                    if(rawMaterials[j].id==parseInt(material_id)){
                        rmidx=j;
                        break;
                    }
                }
                if(rmidx!=-1){
                    for( const product_id in materialList_for_unit_calculating[i][material_id]){
                        let idx = materialList.findIndex(item => item.id === material_id);
                        if (idx !== -1) {
                            materialList[idx].quantity += materialList_for_unit_calculating[i][material_id][product_id][0];
                        } else {
                            materialList.push({
                                id: material_id,
                                name: rawMaterials[rmidx].name,
                                icon: rawMaterials[rmidx].icon,
                                quantity: materialList_for_unit_calculating[i][material_id][product_id][0]
                            });
                        }

                    }
                }

            }
        }
        materialList.sort((a, b) => b.quantity - a.quantity); // Sort by quantity DESC
        materialBreakdownList[counti-1]=(JSON.parse(JSON.stringify(materialList)));// copy not refer.
    }


    //reset the variables that were used in new code (Just in case)=================================
 /*   
    endNode_list.length=0;
    maxDepth=0;

    //New code End=======================================================

    product_array.forEach(p=>{
        if( (p.materials.length==0 || p.isEndNode || (!breakdownFuelblocks && FUEL_BLOCKS.includes(p.typeid)))
            && !endNode_list.includes(parseInt(p.product_index))
        ){
            if(p.manufacturing_level>=maxDepth){// Record the depth
                maxDepth=p.manufacturing_level; 
            }
            addToEndNode(p);
        }
    });

    for(let counti=maxDepth;counti >0;counti--){

        materialList.length=0;

        materialList_for_unit_calculating.length=0;

        rawMaterials.length=0;

        //initialise
        materialList_for_unit_calculating.push({
            [origin_product.typeid]:{
                "0":[origin_product.quantity,origin_product]
            }
        });
        for(let i=1;i<MAX_TREE_DEPTH;i++){
            materialList_for_unit_calculating.push({});
        }

        product_array.forEach(p=>{
            if(!endNode_list.includes(parseInt(p.product_index))){

                p.materials.forEach(m=>{
                    queueMaterial(p,m);
                })
            }
            else{

                let notIncluded=true;
                rawMaterials.forEach(m=>{
                    if(m.id==p.typeid){
                        notIncluded=false;
                    }
                });
                if(notIncluded){
                    rawMaterials.push({
                        id:p.typeid,
                        name:p.itemname,
                        icon:p.iconurl
                    });
                }
            }
        });

        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for(const material_id in materialList_for_unit_calculating[i]){
                for(const product_id in materialList_for_unit_calculating[i][material_id]){
                    if(product_id>0){
                        let sumOfQuantity=0;
                        const bpData= getIndustryRelation(product_id);
                        let materialQuantity;
                        bpData.m.forEach(info=>{
                            if(info.i==material_id){
                                materialQuantity=info.q;
                            }
                        });
                        let neededQuantity=getNeededQuantity(product_id);
                        sumOfQuantity=Math.ceil(Math.ceil(neededQuantity/bpData.q)*materialQuantity * getBonusModifier(product_id));
                        if(sumOfQuantity<Math.ceil(neededQuantity/bpData.q)){
                            sumOfQuantity=Math.ceil(neededQuantity/bpData.q)
                        }
                        materialList_for_unit_calculating[i][material_id][product_id][0]=sumOfQuantity;
                    }
                }
            }
        }
        for(let i=0;i<MAX_TREE_DEPTH;i++){
            for( const material_id in materialList_for_unit_calculating[i]){
                let rmidx=-1;
                for(let j=0;j<rawMaterials.length;j++){
                    if(rawMaterials[j].id==parseInt(material_id)){
                        rmidx=j;
                        break;
                    }
                }
                if(rmidx!=-1){
                    for( const product_id in materialList_for_unit_calculating[i][material_id]){
                        let idx = materialList.findIndex(item => item.id === material_id);
                        if (idx !== -1) {
                            materialList[idx].quantity += materialList_for_unit_calculating[i][material_id][product_id][0];
                        } else {
                            materialList.push({
                                id: material_id,
                                name: rawMaterials[rmidx].name,
                                icon: rawMaterials[rmidx].icon,
                                quantity: materialList_for_unit_calculating[i][material_id][product_id][0]
                            });
                        }

                    }
                }

            }
        }
        materialList.sort((a, b) => b.quantity - a.quantity); // Sort by quantity DESC

        const nextEndNode_list=[];
        product_array.forEach( p=>{
            if(!endNode_list.includes(parseInt(p.product_index))){
                let isNextEndNode=true;
                p.materials.forEach(m=>{
                    if(!endNode_list.includes(parseInt(m.product_index))){
                        isNextEndNode=false;
                    }
                });
                if(isNextEndNode){
                    nextEndNode_list.push(parseInt(p.product_index));
                }
            }
        });
        endNode_list.push(...nextEndNode_list);

        materialBreakdownList[counti-1]=(JSON.parse(JSON.stringify(materialList)));// copy not refer.
    }
        */
    return materialBreakdownList;
}






async function toggleTracking(typeId){
    typeId=parseInt(typeId);
    let idx=tracking_item_list.find(typeId)
    if(idx==-1){
        tracking_item_list.add(typeId); 
    }else{
        tracking_item_list.delete(idx);
    }
}

function copyMaterialsToClipboard(copyType='materials'){

    const allowedCopyType=['materials'];
    if(!allowedCopyType.includes(copyType)){
        copyType='materials';
    }

    if(copyType=="materials"){
        let copyText="";
        material_list.forEach(m=>{
            copyText+=`${m.id}\t${m.name}\t${Math.ceil(m.quantity)}\n`;
        });
        navigator.clipboard.writeText(copyText).then(function() { 
            console.log("Materials are copied to clipboard.");
            showNotification("Materials are copied to clipboard.",'center');
        }).catch(function(e){
            console.error(`Failed to copy : ${e}`);
            showNotification("Error: Failed to copy.");
        });
    }

}


function getIndustryRelation(typeId){
    if(NO_BLUEPRINT.has(parseInt(typeId))){
        let nodata={"industry_type":INDUSTRY_TYPE_NO_DATA};
        nodata.industry_type=INDUSTRY_TYPE_NO_DATA;
        return nodata;
    }
    else if(blueprintData[typeId]){
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

function getJobCost(eiv,index,structureBonus,tax,unitsPerRun=1){
    return eiv*((index/100)*(1-(structureBonus/100))+(tax/100)+(SCC_SUBCHARGE/100))/unitsPerRun;
}

// Function to get the icon URL for a given type ID
function get_iconurl(type_id) {
    return `https://images.evetech.net/types/${type_id}/icon`;
}

// Placeholder function for getBonusModifier - to be defined later
function getBonusModifier(type_id,bonus1=0,bonus2=0,bonus3=0,bonus4=0) {
    // Default bonus modifier for now, should be replaced with actual logic 
    
    let efficiency=10;
    type_id=parseInt(type_id);

    if(type_id==origin_product.typeid){
        efficiency = parseInt(document.getElementById("me-input").value);
    }

    const savedBonus=localStorage.getItem(type_id);
    if(savedBonus){
        return calcBonusMultiplier(savedBonus.me,savedBonus.strRigBonus);
    }
    if(CONSTRUCTION_COMPONENTS.includes(type_id)||CAPITAL_CONSTRUCTION_COMPONENTS.includes(type_id)){
        
        const structureAndRigBonus=document.getElementById("component-structure-efficiency-bonus").value;
        return calcBonusMultiplier(efficiency,structureAndRigBonus);
    }
    if(COMPOSITE.includes(type_id) || INTERMEDIATE_MATERIALS.includes(type_id) || BIOCHEMICAL_MATERIALS.includes(type_id) || MOLECULAR_FORGED_MATERIALS.includes(type_id)){
        
        const structureAndRigBonus=document.getElementById("reaction-structure-efficiency-bonus").value;
        return calcBonusMultiplier(0,structureAndRigBonus)
    }
    if(FUEL_BLOCKS.includes(type_id)){
        const structureAndRigBonus=document.getElementById("fuel-structure-efficiency-bonus").value;
       return calcBonusMultiplier(efficiency,structureAndRigBonus);
    }
    
    const structureAndRigBonus=document.getElementById("manufacturing-structure-efficiency-bonus").value;
    return calcBonusMultiplier(efficiency,structureAndRigBonus);


}


function calcBonusMultiplier(me=10,bonus1=0,bonus2=0,bonus3=0){
    return (1-(me/100)) * (1-(bonus1/100)) * (1-(bonus2/100)) * (1-(bonus3/100));
}

function getMaterialPrice(type_id) {
    type_id = parseInt(type_id);
    
    for (let p of product_array) {
        if (p.typeid == type_id) {

            return p.getPrice();
        }
    }
    

    return 0;
}


// Function to create and show the popup
async function showBreakdownPopup() {

    const materialBreakdownList=await calcMaterialBreakdown();



    const button_copyButton=document.createElement('button');
    const div_anounceText=document.createElement('div');
    const table_materials=document.createElement('table');
    table_materials.classList.add('breakdown-popup')
    let copyText="";
    

    button_copyButton.textContent='📋copy process'
    button_copyButton.classList.add('breakdown-copy-button');
    button_copyButton.addEventListener('click',()=>{
        navigator.clipboard.writeText(copyText).then(function() { 
            console.log("Manufacturing process is copied to clipboard.");
            showNotification("Manufacturing process is copied to clipboard.",'center');
        }).catch(function(e){
            console.error(`Failed to copy : ${e}`);
            showNotification("Error: Failed to copy.");
        });
    });

    div_anounceText.innerHTML="Excute this after <b>open whole tree</b> to work properly. <a href='https://youtu.be/kPimx7_jrJE?si=QOJks3quQQXA0rOS'>How to use this?(Korean)</a>"
    div_anounceText.classList.add('popup-announce');

    let maxheight=0;
    for(let i=0;i<materialBreakdownList.length;i++){
        if(materialBreakdownList[i].length>maxheight){
            maxheight=materialBreakdownList[i].length;
        }
    }
    for(let j=0;j<maxheight;j++){
        const tr_m=document.createElement('tr');
        tr_m.setAttribute('id',`tr-breakdown-${j}`);
        for(let i=0;i<materialBreakdownList.length;i++){
            const td_typeid=document.createElement('td');
            const td_itemname=document.createElement('td');
            const td_quantity=document.createElement('td');
            const td_m=document.createElement('td');

            td_typeid.setAttribute('id',`td-breakdown-${j}-${i}-typeid`);
            td_itemname.setAttribute('id',`td-breakdown-${j}-${i}-itemname`);
            td_quantity.setAttribute('id',`td-breakdown-${j}-${i}-quantity`);

            tr_m.appendChild(td_typeid);
            tr_m.appendChild(td_itemname);
            tr_m.appendChild(td_quantity);
            tr_m.appendChild(td_m);

            if(materialBreakdownList[i][j]){
                copyText+=`${materialBreakdownList[i][j].id}\t${materialBreakdownList[i][j].name}\t${materialBreakdownList[i][j].quantity}\t \t`;
            }
            else{
                copyText+=' \t \t \t \t';
            }
        }
        table_materials.appendChild(tr_m);
        copyText+='\n';
    }
    for(let i=0;i<materialBreakdownList.length;i++){
        for(let j=0;j<materialBreakdownList[i].length;j++){
            const td_typeid=table_materials.querySelector(`#td-breakdown-${j}-${i}-typeid`);
            const td_itemname=table_materials.querySelector(`#td-breakdown-${j}-${i}-itemname`);
            const td_quantity=table_materials.querySelector(`#td-breakdown-${j}-${i}-quantity`);

            td_typeid.textContent=materialBreakdownList[i][j].id;
            td_itemname.textContent=materialBreakdownList[i][j].name;
            td_quantity.textContent=materialBreakdownList[i][j].quantity;
        }
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.setAttribute('id','div-popup-closing-overlay');
    overlay.className = 'popup-closing-overlay';
    overlay.addEventListener('click', closePopup);

    // Create popup container
    const popup = document.createElement('div');
    popup.setAttribute('id','div-breakdown-popup');
    popup.className = 'breakdown-popup';

    // Append content and close button to popup
    popup.appendChild(button_copyButton);
    popup.appendChild(div_anounceText);
    popup.appendChild(table_materials);

    // Append popup and overlay to the document body
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Function to close the popup
    function closePopup() {
        const closingPopup = document.querySelector('#div-popup-closing-overlay');
        const closingOverlay = document.querySelector('#div-breakdown-popup');
        if (closingPopup) closingPopup.remove();
        if (closingOverlay) closingOverlay.remove();
    }
}
