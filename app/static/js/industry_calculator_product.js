
const BONUS_SETTING_ICON_URL=""

class Product {
    constructor(itemname, typeid, iconurl, output_per_run, quantity, level, row, product_node) {
        this.itemname = itemname;
        this.typeid = typeid;
        this.iconurl = iconurl;
        this.output_per_run = output_per_run;
        this.quantity = quantity;

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

        this.table_pannel=document.createElement('table');
        this.table_pannel.classList.add('product-table');
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
    async calcPrice() {
        if (this.material.length === 0) {
            this.costprice = 0;
        } else {
            let total = 0;
            this.material.forEach(material => {
                if (material.pricetype === 1) {
                    total += material.buyprice * material.quantity;
                } else if (material.pricetype === 2) {
                    total += material.sellprice * material.quantity;
                } else if (material.pricetype === 3) {
                    material.calcPrice(); // Calculate the custom price for the material
                    total += material.costprice * material.quantity;
                }
            });
            this.costprice = total;
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

        // Item Name Area
        itemNameCell.textContent = Math.ceil(this.quantity).toString()+"x "+ this.itemname;
        itemNameCell.classList.add('product-name');

        // Setting Icon Area
        const settingIcon = document.createElement('img');
        settingIcon.src = BONUS_SETTING_ICON_URL; // Replace with actual setting icon URL
        settingIcon.alt = 'Settings';
        settingIcon.classList.add('setting-icon');
        settingIconCell.appendChild(settingIcon);

        row1.appendChild(itemIconCell);
        row1.appendChild(itemNameCell);
        row1.appendChild(settingIconCell);

        const row2 = document.createElement('tr');
        const priceTableCell = document.createElement('td');
        priceTableCell.colSpan = 2;

        // Price Table Area
        const priceTable = document.createElement('table');
        priceTable.classList.add('price-table');

        const sellRow = document.createElement('tr');
        const sellLabelCell = document.createElement('td');
        const sellPriceCell = document.createElement('td');
        const sellRadioCell = document.createElement('td');
        sellLabelCell.textContent = 'Sell:';
        sellPriceCell.textContent = this.sellprice;
        const sellRadio = document.createElement('input');
        sellRadio.type = 'radio';
        sellRadio.name = `price-type-${this.typeid}`;
        sellRadio.value = 2;
        sellRadio.checked = (this.pricetype === 2);
        sellRadioCell.appendChild(sellRadio);
        sellRow.appendChild(sellLabelCell);
        sellRow.appendChild(sellPriceCell);
        sellRow.appendChild(sellRadioCell);

        const buyRow = document.createElement('tr');
        const buyLabelCell = document.createElement('td');
        const buyPriceCell = document.createElement('td');
        const buyRadioCell = document.createElement('td');
        buyLabelCell.textContent = 'Buy:';
        buyPriceCell.textContent = this.buyprice;
        const buyRadio = document.createElement('input');
        buyRadio.type = 'radio';
        buyRadio.name = `price-type-${this.typeid}`;
        buyRadio.value = 1;
        buyRadio.checked = (this.pricetype === 1);
        buyRadioCell.appendChild(buyRadio);
        buyRow.appendChild(buyLabelCell);
        buyRow.appendChild(buyPriceCell);
        buyRow.appendChild(buyRadioCell);

        const costRow = document.createElement('tr');
        const costLabelCell = document.createElement('td');
        const costPriceCell = document.createElement('td');
        const costRadioCell = document.createElement('td');
        costLabelCell.textContent = 'Cost:';
        costPriceCell.textContent = this.costprice;
        const costRadio = document.createElement('input');
        costRadio.type = 'radio';
        costRadio.name = `price-type-${this.typeid}`;
        costRadio.value = 3;
        costRadio.checked = (this.pricetype === 3);
        costRadioCell.appendChild(costRadio);
        costRow.appendChild(costLabelCell);
        costRow.appendChild(costPriceCell);
        costRow.appendChild(costRadioCell);

        const customRow = document.createElement('tr');
        const customPriceLabelCell = document.createElement('td');
        const customPriceInputCell = document.createElement('td');
        const customRadioCell = document.createElement('td');
        customPriceLabelCell.textContent = 'Custom price:';
        const customPriceInput = document.createElement('input');
        customPriceInput.type = 'number';
        customPriceInput.min = 0;
        customPriceInput.step = 0.01;
        customPriceInput.value = this.customprice;
        customPriceInput.classList.add('custom-price-input');
        customPriceInputCell.colSpan = 2;
        customPriceInputCell.appendChild(customPriceInput);
        const customRadio = document.createElement('input');
        customRadio.type = 'radio';
        customRadio.name = `price-type-${this.typeid}`;
        customRadio.value = 0;
        customRadio.checked = (this.pricetype === 0);
        customRadioCell.appendChild(customRadio);
        customRow.appendChild(customPriceLabelCell);
        customRow.appendChild(customPriceInputCell);
        customRow.appendChild(customRadioCell);

        priceTable.appendChild(sellRow);
        priceTable.appendChild(buyRow);
        priceTable.appendChild(costRow);
        priceTable.appendChild(customRow);
        
        priceTableCell.appendChild(priceTable);
        
        const nextTreeCell = document.createElement('td');
        const nextTreeButton = document.createElement('button');
        nextTreeButton.textContent = 'Next Tree';
        nextTreeButton.classList.add('next-tree-button');
        nextTreeCell.appendChild(nextTreeButton);
        
        row2.appendChild(priceTableCell);
        row2.appendChild(nextTreeCell);
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
