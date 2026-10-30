
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileId = document.getElementById("profile-id");
const profileDate = document.getElementById("profile-date");
const displayName = document.getElementById("profile-display-name");

const editSection = document.getElementById("edit-profile-section");
const profileForm = document.getElementById("profile-form");

const nameInput = document.getElementById("customer-name");
const emailInput = document.getElementById("customer-email");

const message = document.getElementById("profile-message");
const ordersList = document.getElementById("customer-orders-list");

// LOAD CUSTOMER PROFILE
async function loadProfile() {
    try {
        const response = await fetch("/api/auth/profile");
        const data = await response.json();

        if (response.status === 401) {
            alert("Please login to view your profile.");
            window.location.href = "auth.html";
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load profile");
        }

        const user = data.user;

        displayName.textContent = user.name;
        profileName.textContent = user.name;
        profileEmail.textContent = user.email;
        profileId.textContent = user.id;

        profileDate.textContent = user.created_at
            ? new Date(user.created_at).toLocaleDateString("en-IN")
            : "Not available";

        nameInput.value = user.name;
        emailInput.value = user.email;

    } catch (error) {
        console.error("PROFILE ERROR:", error);
        displayName.textContent = "Unable to load profile";
        message.textContent = error.message;
        message.style.color = "red";
    }
}

// LOAD CUSTOMER ORDERS
async function loadCustomerOrders() {
    try {
        const response = await fetch("/api/orders");
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "auth.html";
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to fetch orders");
        }

        if (!data.orders || data.orders.length === 0) {
            ordersList.innerHTML = `
                <div class="no-orders">
                    <h3>No Orders Yet ☕</h3>
                    <p>Your coffee orders will appear here.</p>
                    <a href="index.html#menu">Explore Our Menu</a>
                </div>
            `;
            return;
        }

        // Group products belonging to the same order
        const groupedOrders = {};

        data.orders.forEach(item => {
            if (!groupedOrders[item.order_id]) {
                groupedOrders[item.order_id] = {
                    id: item.order_id,
                    total: item.total_amount,
                    status: item.status,
                    date: item.created_at,
                    items: []
                };
            }

            groupedOrders[item.order_id].items.push(item);
        });

        ordersList.innerHTML = Object.values(groupedOrders)
            .map(order => {

                const orderItems = order.items.map(item => `
                    <div class="order-product">
                        <span>${escapeHTML(item.product_name)}</span>
                        <span>
                            ${item.quantity} × ₹${Number(item.price).toFixed(2)}
                        </span>
                    </div>
                `).join("");

                return `
                    <div class="customer-order-card">

                        <div class="order-card-header">
                            <div>
                                <h3>Order #${order.id}</h3>
                                <p>${new Date(order.date).toLocaleString("en-IN")}</p>
                            </div>

                            <span class="order-status ${getStatusClass(order.status)}">
                                ${escapeHTML(order.status)}
                            </span>
                        </div>

                        <div class="order-products">
                            ${orderItems}
                        </div>

                        <div class="order-card-footer">
                            <strong>Total: ₹${Number(order.total).toFixed(2)}</strong>
                        </div>

                    </div>
                `;
            }).join("");

    } catch (error) {
        console.error("ORDERS ERROR:", error);

        ordersList.innerHTML = `
            <p class="order-error">
                Unable to load orders. Please try again.
            </p>
        `;
    }
}

// STATUS CLASS
function getStatusClass(status) {
    switch (status) {
        case "Pending":
            return "status-pending";

        case "Processing":
            return "status-processing";

        case "Completed":
            return "status-completed";

        case "Cancelled":
            return "status-cancelled";

        default:
            return "";
    }
}

// SAFE HTML TEXT
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// SHOW EDIT PROFILE FORM
document.getElementById("edit-profile-btn")
    .addEventListener("click", () => {

        editSection.style.display = "block";
        message.textContent = "";

        editSection.scrollIntoView({
            behavior: "smooth"
        });
    });

// CANCEL EDIT
document.getElementById("cancel-edit-btn")
    .addEventListener("click", () => {

        editSection.style.display = "none";
        message.textContent = "";
        loadProfile();
    });

// UPDATE PROFILE
profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) {
        message.textContent = "Please fill all fields.";
        message.style.color = "red";
        return;
    }

    try {
        const response = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email })
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "auth.html";
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Profile update failed");
        }

        message.textContent = "Profile updated successfully!";
        message.style.color = "green";

        await loadProfile();

        setTimeout(() => {
            editSection.style.display = "none";
        }, 1200);

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";
    }
});

// LOGOUT
document.getElementById("logout-btn")
    .addEventListener("click", async () => {

        if (!confirm("Are you sure you want to logout?")) {
            return;
        }

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST"
            });

            const data = await response.json();

            if (data.success) {
                alert("Logout successful!");
                window.location.href = "auth.html";
            } else {
                alert(data.message || "Logout failed");
            }

        } catch (error) {
            console.error("LOGOUT ERROR:", error);
            alert("Unable to logout. Please try again.");
        }
    });

// PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadCustomerOrders();
});
