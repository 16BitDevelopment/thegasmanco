// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase, ref, child, get, set, update, remove, query, orderByChild, orderByKey, limitToFirst, equalTo } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyARaN0yKph6XutL6lmzzz5-l-_EOQGPTy0",
    authDomain: "thegasmanco-2fb92.firebaseapp.com",
    databaseURL: "https://thegasmanco-2fb92-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thegasmanco-2fb92",
    storageBucket: "thegasmanco-2fb92.firebasestorage.app",
    messagingSenderId: "691232851376",
    appId: "1:691232851376:web:356ac9e863b0dcbf708275"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase();
const dbRef = ref(db);

function logOut() {
    signOut(auth).then(() => {
        // Sign-out successful.
        console.log("User signed out successfully.");
    }).catch((error) => {
        // An error happened.
        console.error("Error signing out:", error);
    });
}

window.logOut = logOut;

// Html

const formEl = document.getElementById("login-form");
const formContainerEl = document.getElementById("login-form-container");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const errorEl = document.getElementById("error-msg");

const ordersEl = document.getElementById("orders");
const orderPreviewEl = document.getElementById("order-preview");
const statusIncompleteEl = document.getElementById("status-incomplete");
const statusCompleteEl = document.getElementById("status-complete");

formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    signInWithEmailAndPassword(auth, emailEl.value, passwordEl.value)
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;

            formContainerEl.classList.add("hidden");
        })
        .catch((error) => {
            // Error signing in
            const errorCode = error.code;
            const errorMessage = error.message;

            if (errorCode == "auth/invalid-credential") {
                errorEl.innerText = "Invalid Email or Password";
            } else {
                errorEl.innerText = "Error Logging In";
            }

            errorEl.style.display = "inline-block";
        });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("navbar-email").innerText = user.email;

        formContainerEl.classList.remove("show");
        ordersEl.classList.add("show");

        getAllOrders(0);

        document.title = "Orders"
    } else {
        emailEl.value = "";
        passwordEl.value = "";

        ordersEl.classList.remove("show");
        formContainerEl.classList.add("show");

        document.title = "Admin Login";
    }
});

statusIncompleteEl.addEventListener("change", (event) => {
    if (statusIncompleteEl.value == "on") {
        getAllOrders(0);
    }
});

statusCompleteEl.addEventListener("change", (event) => {
    if (statusCompleteEl.value == "on") {
        getAllOrders(1);
    }
});

let allIncompleteOrders;
let allCompleteOrders;

function getAllOrders(status = 0) {
    if (status === 0 && allIncompleteOrders) {
        loadOrders(allIncompleteOrders);

        return;
    } else if (status === 1 && allCompleteOrders) {
        loadOrders(allCompleteOrders);
        
        return;
    }

    let allOrders = [];

    const fetchFromLocation = async (location) => {
        const q = query(
            ref(db, location),
            orderByChild("status"),
            equalTo(status)
        );

        const snapshot = await get(q);
        if (snapshot.exists()) {
            const orders = snapshot.val();

            for (let order in orders) {
                if (orders.hasOwnProperty(order)) {
                    const orderData = JSON.parse(JSON.stringify(orders[order]));
                    orderData.gasman = location;
                    orderData.id = order;
                    allOrders.push(orderData);
                }
            }
        } else {
            console.log(`No data available for ${location}`);
        }
    };

    const locations = ["admin", "mullum", "byron", "federal"];

    const getOrders = async () => {
        for (const location of locations) {
            await fetchFromLocation(location);
        }

        if (status === 0) {
            allIncompleteOrders = Array.from(allOrders);
        } else if (status === 1) {
            allCompleteOrders = Array.from(allOrders);
        }

        loadOrders(allOrders, status);
    };

    getOrders(); // Loads the orders to the html
}

function loadOrders(allOrders, status) {
    console.log(allOrders); // Logs after all fetches are done

    document.querySelectorAll(".order").forEach((el) => {
        el.remove();
    });
    
    allOrders.forEach((order, idx) => {
        const timeInDays = Math.floor((Date.now() - order.time) / (1000 * 60 * 60 * 24));
        const timeInHours = Math.floor(((Date.now() - order.time) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        const orderEl = document.createElement("div");
        orderEl.className = "order";

        orderEl.addEventListener("click", (event) => {
            orderPreviewEl.innerHTML = `
                <div class="order-preview">
                    <button class="close-preview" onclick="document.getElementById('order-preview').classList.remove('show')">x</button>
                    <h2>Order # ${order.id}</h2>
                    <h3>${order.name}</h3>
                    <p style="font-size: 1em;">${order.email}</p>
                    <p style="font-size: 1em;">${order.phone}</p>
                    <h4>Time Of Request</h4>
                    <p>${timeInDays} day(s), ${timeInHours} hour(s) ago</p>
                    <h4>Address</h4>
                    <p>${order.address}, ${order.location}, ${order.postcode}</p>
                    <h4>Order</h4>
                    <p>${order.cylinder}kg x ${order.quantity}</p>
                    <h4>Payment</h4>
                    <p>${order.payment} - $${order.cost}</p>
                    ${order.status === 0 ? "<button class='complete-order' id='complete-order'>Complete Order</button>" : "<h4 style='color: #00FF00;'>Order Complete</h4>"}
                    <button class='delete-order' id='delete-order'>Delete Order</button>
                </div>
            `;

            const completeOrderBtn = document.getElementById("complete-order");
            const deleteOrderBtn = document.getElementById("delete-order");

            if (completeOrderBtn) {
                completeOrderBtn.addEventListener("click", (event) => {
                    set(ref(db, `${order.gasman}/${order.id}/status`), 1);

                    order.status = 1;

                    orderEl.innerHTML = `
                        <p>${order.id}</p>
                        <p ${order.status === 0 ? "style='color: red;'>Incomplete" : "style='color: #00FF00;'>Complete"}</p>
                        <p>${timeInDays == 0 ? "" : timeInDays + " day(s), "}${timeInHours} hour(s)</p>
                        <p>${order.name}</p>
                        <p>${order.location}</p>
                        <p>${order.payment}</p>
                    `;

                    orderPreviewEl.classList.remove("show");
                });
            }

            deleteOrderBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                event.preventDefault();

                deleteOrderBtn.style.cursor = "default";

                deleteOrderBtn.innerHTML = "<strong>Are you sure?</strong><br>";

                const yesEl = document.createElement("button");
                yesEl.className = "delete-prompt";
                yesEl.innerText = "Yes";

                yesEl.addEventListener("click", (event) => {
                    remove(ref(db, `${order.gasman}/${order.id}`));

                    orderPreviewEl.classList.remove("show");

                    if (status === 0) {
                        allIncompleteOrders = allIncompleteOrders.filter((item) => item !== order)
                    } else if (status === 1) {
                        allCompleteOrders = allCompleteOrders.filter((item) => item !== order)
                    }

                    getAllOrders(status)
                });

                const noEl = document.createElement("button");
                noEl.className = "delete-prompt";
                noEl.innerText = "No";

                noEl.addEventListener("click", (event) => {
                    event.stopPropagation();

                    deleteOrderBtn.style.cursor = "pointer";

                    deleteOrderBtn.innerText = "Delete Order";
                });

                deleteOrderBtn.append(yesEl);
                deleteOrderBtn.append(noEl);
            });

            orderPreviewEl.classList.add("show");
        });

        orderEl.innerHTML = `
            <p>${order.id}</p>
            <p>${timeInDays == 0 ? "" : timeInDays + " day(s), "}${timeInHours} hour(s)</p>
            <p>${order.name}</p>
            <p>${order.location}</p>
            <p>${order.payment}</p>
        `;

        ordersEl.append(orderEl)
    });
}