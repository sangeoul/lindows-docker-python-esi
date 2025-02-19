// Define a wider-scope variable to store data from the initial fetch
let buybackData = {};

document.getElementById("calculateButton").addEventListener("click", function() {
    const language = 'en'//document.getElementById("language").value;
    const inputItems = document.getElementById("input_items").value;

    // Prepare request payload
    const payload = {
        language: language,
        input_items: inputItems
    };

    // Send AJAX request
    fetch("/industry/buyback", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (!data || !data.results || Object.keys(data.results).length === 0) {
            alert('No results returned. Please check your input.');
            return;
        }

        // Save the data into the wider-scope variable for reuse
        buybackData = data;

        const resultSection = document.getElementById("resultSection");
        const submitSection = document.getElementById("submitSection");
        resultSection.innerHTML = ''; // Clear old results

        // Tab links

        const div_tablinks=document.createElement('div');
        const button_tab1=document.createElement('button');
        const button_tab2=document.createElement('button');

        div_tablinks.classList.add('tab-links');
        button_tab1.classList.add('tab-link','active');
        button_tab1.setAttribute('data-tab',"1");
        button_tab1.innerHTML="Input";
        button_tab2.classList.add('tab-link');
        button_tab2.setAttribute('data-tab',"2");
        button_tab2.innerHTML="Output";

        div_tablinks.appendChild(button_tab1);
        div_tablinks.appendChild(button_tab2);

        resultSection.appendChild(div_tablinks);


        // Sort 
        const sortedResults = Object.fromEntries(
            Object.entries(data.results).sort((a, b) => b[1].input_price - a[1].input_price)
        );
        
        data.results = sortedResults;

        const sortedOutputResults = Object.fromEntries(
            Object.entries(data.output_results).sort((a, b) => b[1].output_price - a[1].output_price)
        );


        const div_tab1=document.createElement('div');
        div_tab1.setAttribute('id','tab1');
        div_tab1.classList.add("tab","active");

        
        data.output_results = sortedOutputResults;

        const table_inputItems=document.createElement('table')
        
        const tr_inputHead=document.createElement('tr');
        const th_inputHeadItem=document.createElement('th');
        const th_inputHeadAmount=document.createElement('th');
        const th_inputHeadPrice=document.createElement('th');
        const th_inputHeadRate=document.createElement('th');

        th_inputHeadItem.innerHTML='Item';
        th_inputHeadAmount.innerHTML='Amount';
        th_inputHeadPrice.innerHTML='Price (ISK)';
        th_inputHeadRate.innerHTML='Buyback Rate';
        tr_inputHead.appendChild(th_inputHeadItem);
        tr_inputHead.appendChild(th_inputHeadAmount);
        tr_inputHead.appendChild(th_inputHeadPrice);
        tr_inputHead.appendChild(th_inputHeadRate);

        
        Object.entries(data.results).map(([item,input])=>{

            const tr_itemline=document.createElement('tr');
            const td_name=document.createElement('td');
            const img_icon=document.createElement('img');
            const span_name=document.createElement('span');
            const td_amount=document.createElement('td');
            const td_price=document.createElement('td');
            const td_rate=document.createElement('td');

            td_name.classList.add('item-name');
            td_amount.classList.add('amount');
            td_price.classList.add('price');
            td_rate.classList.add('buyback-rate');


            img_icon.setAttribute('src',data.icons[item]);
            img_icon.setAttribute('alt',item);
            img_icon.setAttribute('width','30');
            span_name.innerHTML=item;
            td_name.appendChild(img_icon);
            td_name.appendChild(span_name);

            td_amount.innerHTML=input.input_amount.toLocaleString();
            td_price.innerHTML=parseFloat(input.input_price.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            td_rate.innerHTML=(input.input_buyprice > 0 ?
                parseFloat((input.input_price * 100 / (input.input_buyprice * input.input_amount)).toFixed(2)).toLocaleString() + "%" :
                "No Jita buy");

            tr_itemline.appendChild(td_name);
            tr_itemline.appendChild(td_amount);
            tr_itemline.appendChild(td_price);
            tr_itemline.appendChild(td_rate);

            table_inputItems.appendChild(tr_itemline);
        });

        const tr_inputTotalPrice=document.createElement('tr');
        const td_inputTotalPriceHead=document.createElement('td');
        const td_inputTotalPrice=document.createElement('td');

        tr_inputTotalPrice.classList.add('total-price');

        td_inputTotalPriceHead.setAttribute('colspan','2');
        td_inputTotalPriceHead.innerHTML='Total Price';

        td_inputTotalPrice.innerHTML=Object.values(data.results).reduce((sum, input) => sum + input.input_price, 0).toLocaleString();

        tr_inputTotalPrice.appendChild(td_inputTotalPriceHead);
        tr_inputTotalPrice.appendChild(td_inputTotalPrice);

        table_inputItems.appendChild(tr_inputTotalPrice);

        div_tab1.appendChild(table_inputItems);




        
        // Tab 1 content (Input Items)
        /*const tab1Content =
        
        `
            <div id="tab1" class="tab active">
                <h2>Input Items</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Amount</th>
                            <th>Price (ISK)</th>
                            <th>Buyback Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.results)
                            .sort((a, b) => b[1].input_price - a[1].input_price) // Sorting by Total Price DESC
                            .map(([item, input]) => `
                                <tr class="valid-${input.valid}">
                                    <td class="item-name">
                                        <img src="${data.icons[item]}" alt="${item}" width="30">
                                        ${item}
                                    </td>
                                    <td class="amount">${input.input_amount.toLocaleString()}</td>
                                    <td class="price">${parseFloat(input.input_price.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td class="buyback-rate">${input.input_buyprice > 0 
                                        ? parseFloat((input.input_price * 100 / (input.input_buyprice * input.input_amount)).toFixed(2)).toLocaleString() + "%" 
                                        : "No Jita buy"}</td>
                                </tr>
                            `).join('')}
                        <tr>
                            <td colspan="2"><strong>Total Price</strong></td>
                            <td colspan="2">
                                <span class="total-price">
                                    ${Object.values(data.results).reduce((sum, input) => sum + input.input_price, 0).toLocaleString()}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        */

        const div_tab2=document.createElement('div');
        div_tab2.setAttribute('id','tab2');
        div_tab2.classList.add("tab","active");
        
        data.output_results = sortedOutputResults;

        const table_outputItems=document.createElement('table')
        
        const tr_outputHead=document.createElement('tr');
        const th_outputHeadItem=document.createElement('th');
        const th_outputHeadAmount=document.createElement('th');
        const th_outputHeadPrice=document.createElement('th');
        const th_outputHeadRate=document.createElement('th');

        th_outputHeadItem.innerHTML='Item';
        th_outputHeadAmount.innerHTML='Amount';
        th_outputHeadPrice.innerHTML='Price (ISK)';
        th_outputHeadRate.innerHTML='Buyback Rate';
        tr_outputHead.appendChild(th_outputHeadItem);
        tr_outputHead.appendChild(th_outputHeadAmount);
        tr_outputHead.appendChild(th_outputHeadPrice);
        tr_outputHead.appendChild(th_outputHeadRate);

        
        data.output_results.map(output=>{

            const tr_itemline=document.createElement('tr');
            const td_name=document.createElement('td');
            const img_icon=document.createElement('img');
            const span_name=document.createElement('span');
            const td_amount=document.createElement('td');
            const td_price=document.createElement('td');
            const td_rate=document.createElement('td');

            td_name.classList.add('item-name');
            td_amount.classList.add('amount');
            td_price.classList.add('price');
            td_rate.classList.add('buyback-rate');


            img_icon.setAttribute('src',output.output_icon);
            img_icon.setAttribute('alt',output.output_name);
            img_icon.setAttribute('width','30');
            span_name.innerHTML=output.output_name;
            td_name.appendChild(img_icon);
            td_name.appendChild(span_name);

            td_amount.innerHTML=Math.floor(output.output_amount).toLocaleString();
            td_price.innerHTML=parseFloat(output.output_price.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            td_rate.innerHTML=(output.output_buyprice > 0 ?
                parseFloat((output.output_price * 100 / (output.output_buyprice * output.output_amount)).toFixed(2)).toLocaleString() + "%" :
                "No Jita buy");

            tr_itemline.appendChild(td_name);
            tr_itemline.appendChild(td_amount);
            tr_itemline.appendChild(td_price);
            tr_itemline.appendChild(td_rate);

            table_outputItems.appendChild(tr_itemline);
        });

        const tr_outputTotalPrice=document.createElement('tr');
        const td_outputTotalPriceHead=document.createElement('td');
        const td_outputTotalPrice=document.createElement('td');

        tr_outputTotalPrice.classList.add('total-price');

        td_outputTotalPriceHead.setAttribute('colspan','2');
        td_outputTotalPriceHead.innerHTML='Total Price';

        td_outputTotalPrice.innerHTML=data.output_results.reduce((sum, output) => sum + output.output_price, 0).toLocaleString();
        
        tr_outputTotalPrice.appendChild(td_outputTotalPriceHead);
        tr_outputTotalPrice.appendChild(td_outputTotalPrice);

        table_outputItems.appendChild(tr_outputTotalPrice);

        div_tab2.appendChild(table_outputItems);


        // Tab 2 content (Output Items)

        /*
        const tab2Content = `
            <div id="tab2" class="tab">
                <h2>Output Items</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th> <!-- Added Item column here -->
                            <th>Amount</th>
                            <th>Total Price (ISK)</th>
                            <th>Buyback Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.output_results
                            .sort((a, b) => b.output_price - a.output_price) // Sorting by Total Price DESC
                            .map(output => `
                                <tr>
                                    <td class="item-name">
                                        <img src="${output.output_icon}" alt="${output.output_name}" width="30">
                                        ${output.output_name}
                                    </td>
                                    <td class="amount">${Math.floor(output.output_amount).toLocaleString()}</td>
                                    <td class="price">${parseFloat(output.output_price.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td class="buyback-rate">${parseFloat((output.output_price * 100 / (output.output_buyprice * Math.floor(output.output_amount))).toFixed(2)).toLocaleString()}%</td>
                                </tr>
                            `).join('')}
                        <tr>
                            <td colspan="2"><strong>Total Price</strong></td>
                            <td colspan="2">
                                <strong>
                                    ${data.output_results.reduce((sum, output) => sum + output.output_price, 0).toLocaleString()}
                                </strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        */
        resultSection.appendChild(div_tab1);
        //resultSection.insertAdjacentHTML("beforeend", tab1Content);
        resultSection.appendChild(div_tab2);
        //resultSection.insertAdjacentHTML("beforeend", tab2Content);

        // Show the Submit Button if there are valid input results
        if (data.valid) {
            submitSection.style.display = 'block';
        } else {
            submitSection.style.display = 'none';
        }

        // Handle tab navigation
        document.querySelectorAll(".tab-link").forEach(button => {
            button.addEventListener("click", (e) => {
                const tabId = e.target.getAttribute("data-tab");
                document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
                document.querySelector(`#tab${tabId}`).classList.add("active");

                document.querySelectorAll(".tab-link").forEach(btn => btn.classList.remove("active"));
                e.target.classList.add("active");
            });
        });
    })
    .catch(error => console.error("Error:", error));
});

// Submit button logic
document.getElementById("submitButton").addEventListener("click", function() {
    if (!buybackData || !buybackData.results || !buybackData.output_results) {
        alert("No data to submit. Please calculate first.");
        return;
    }

    // Prepare input and output item lists for submission
    const inputItems = Object.entries(buybackData.results).map(([item, input]) => ({
        item_name: item,
        amount: input.input_amount,
        buyprice: input.input_buyprice,
        total_price: input.input_price
    }));

    const outputItems = buybackData.output_results.map(output => ({
        item_name: output.output_name,
        amount: output.output_amount,
        buyprice: output.output_buyprice,
        total_price: output.output_price
    }));

    // Prepare POST data to send to the buyback_submit endpoint
    const payload = {
        language: buybackData.language,
        input_items: inputItems,
        output_items: outputItems
    };

    // Create a hidden form to send the POST request
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "buyback_submit"; // The endpoint to submit the data to

    // Add each field as a hidden input
    for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
            // Handle array data for input_items and output_items
            value.forEach((item, index) => {
                const itemInput = document.createElement("input");
                itemInput.type = "hidden";
                itemInput.name = `${key}[${index}]`; // Format for array data (e.g., input_items[0], output_items[0])
                itemInput.value = JSON.stringify(item); // Convert the item to a JSON string
                form.appendChild(itemInput);
            });
        } else {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }
    }

    // Append the form to the body and submit it
    document.body.appendChild(form);
    form.submit();
});


function open_notice_popup(){
    
    window.open('/buyback_notice?language=ko', 'popupWindow', 'width=600,height=400,scrollbars=yes');

}

document.addEventListener('DOMContentLoaded',()=>{

    const hover_introduction=document.querySelector('#hover_introduction');
    const question_mark=document.querySelector('#questionmark');
    const coverscreen=document.querySelector('#coverscreen');
    
    question_mark.addEventListener('click',()=>{
        const rect=question_mark.getBoundingClientRect();
        
        hover_introduction.style.left=(rect.left-5)+'px';
        hover_introduction.style.top=(rect.top-5)+'px';
    
        hover_introduction.classList.remove('hidden-data');
        coverscreen.classList.remove('hidden-data');
    });

    coverscreen.addEventListener('click',()=>{
        hover_introduction.classList.add('hidden-data');
        coverscreen.classList.add('hidden-data');
    });
});

function showNotification(message, position = 'right-bottom') {

    const allowedPosition=['right-bottom','top-right','bottom-left','top-left','center'];
    if(!allowedPosition.includes(position)){
        position='right-bottom';
    }


    const notification = document.createElement('div');
    notification.setAttribute('id', 'notification');
    notification.classList.add('notification');
    
    // Set the position class
    position=position.toLowerCase();
    const positionClass = `notification-${position}`;
    notification.classList.add(positionClass);


    notification.innerText = message;
    notification.style.display = 'block';
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = 1;
    }, 10); // slight delay to ensure transition

    setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => {
            notification.remove(); // Remove element after animation
        }, 500); // match this duration to CSS transition
    }, 2000); // duration for which the notification stays visible
}
