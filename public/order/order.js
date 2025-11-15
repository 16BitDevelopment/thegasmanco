const locationEl = document.getElementById("location");
const mainFormEl = document.getElementById("main-form");

const quantityEl = document.getElementById("quantity");

const cardEl = document.getElementById("card");
const cashEl = document.getElementById("cash");
const directDepositEl = document.getElementById("direct-deposit");

const paymentInfoEl = document.getElementById("payment-info");
const orderTotalEl = document.getElementById("order-total");

let stripeGST = true;

updateOrderTotal();

function updateOrderTotal() {
    if (stripeGST) {
        orderTotalEl.innerHTML = `Total: <strong>$${Math.round(((quantityEl.value * 155) * 1.0175 + 0.3) * 100) / 100}</strong>`;
    } else {
        orderTotalEl.innerHTML = `Total: <strong>$${quantityEl.value * 155}</strong>`;
    }
}

locationEl.addEventListener("change", (event) => {
    if (locationEl.value !== "") {
        mainFormEl.style.display = "flex";
    } else {
        mainFormEl.style.display = "none";
    }
});

quantityEl.addEventListener("change", (event) => {
    quantityEl.value = parseInt(quantityEl.value);

    updateOrderTotal();
});

cardEl.addEventListener("change", (event) => {
    if (cardEl.value === "Card") {
        paymentInfoEl.innerHTML = `
            <p>Credit Card payments apply an additional 1.75% + $0.30 processing fee.</p>
        `;

        stripeGST = true;
        updateOrderTotal();
    }
});

cashEl.addEventListener("change", (event) => {
    if (cardEl.value === "Card") {
        paymentInfoEl.innerHTML = `
            <p>Have your cash ready on delivery.</p>
        `;

        stripeGST = false;
        updateOrderTotal();
    }
});

directDepositEl.addEventListener("change", (event) => {
    if (cardEl.value === "Card") {
        paymentInfoEl.innerHTML = `
            <p class="note">Please use your First and Last name as the Payment Description.</p>
            <p><strong>Bank:</strong> Commonwealth Bank</p>
            <p><strong>Account Name:</strong> ROBBO Solutions</p>
            <p><strong>BSB:</strong> 062-692</p>
            <p><strong>Account Number:</strong> 49200982</p>
        `;

        stripeGST = false;
        updateOrderTotal();
    }
});