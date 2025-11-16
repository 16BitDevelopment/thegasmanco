// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase, ref, child, get, set, update, remove } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js"
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

        loadOrders();

        document.title = "Orders"
    } else {
        emailEl.value = "";
        passwordEl.value = "";

        ordersEl.classList.remove("show");
        formContainerEl.classList.add("show");

        document.title = "Admin Login"
    }
});

function loadOrders() {
    let allOrders = [];

    console.log(allOrders)

    const fetchOrders = (location) => {
        return get(child(dbRef, location)).then(snapshot => {
            if (snapshot.exists()) {
                const orders = snapshot.val();
                for (let order in orders) {
                    if (orders.hasOwnProperty(order)) {
                        const orderData = JSON.parse(JSON.stringify(orders[order]));
                        orderData.id = order;
                        orderData.parent = location;
                        allOrders.push(orderData);
                    }
                }
            } else {
                console.log(`No data available for ${location}`);
            }
        }).catch(error => {
            console.error(`Error fetching ${location} orders:`, error);
        });
    };

    const promises = [
        fetchOrders("mullum"),
        fetchOrders("byron"),
        fetchOrders("federal")
    ];

    Promise.all(promises)
        .then(() => {
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
                        </div>
                    `;

                    const completeOrderBtn = document.getElementById("complete-order");

                    if (completeOrderBtn) {
                        completeOrderBtn.addEventListener("click", (event) => {
                            set(ref(db, `${order.parent}/${order.id}/status`), 1);

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

                    orderPreviewEl.classList.add("show");
                });

                orderEl.innerHTML = `
                    <p>${order.id}</p>
                    <p ${order.status === 0 ? "style='color: red;'>Incomplete" : "style='color: #00FF00;'>Complete"}</p>
                    <p>${timeInDays == 0 ? "" : timeInDays + " day(s), "}${timeInHours} hour(s)</p>
                    <p>${order.name}</p>
                    <p>${order.location}</p>
                    <p>${order.payment}</p>
                `;

                ordersEl.append(orderEl)
            });
        })
        .catch(error => {
            console.error("Error fetching orders:", error);
        });
}