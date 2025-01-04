// Define a wider-scope variable to store data from the initial fetch
let buybackData = {};

document.getElementById("calculateButton").addEventListener("click", function() {
    const language = document.getElementById("language").value;
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
        const tabLinks = `
            <div class="tab-links">
                <button class="tab-link active" data-tab="1">Input</button>
                <button class="tab-link" data-tab="2">Output</button>
            </div>
        `;
        resultSection.insertAdjacentHTML("beforeend", tabLinks);

        // Tab 1 content (Input Items)
        const tab1Content = `
            <div id="tab1" class="tab active">
                <h2>Input Items</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Amount</th>
                            <th>Total Price (ISK)</th>
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
                                <strong>
                                    ${Object.values(data.results).reduce((sum, input) => sum + input.input_price, 0).toLocaleString()}
                                </strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        // Tab 2 content (Output Items)
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
                                    <td class="buyback-rate">${parseFloat((output.output_price * 100 / (output.output_buyprice * output.output_amount)).toFixed(2)).toLocaleString()}%</td>
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

        resultSection.insertAdjacentHTML("beforeend", tab1Content);
        resultSection.insertAdjacentHTML("beforeend", tab2Content);

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
