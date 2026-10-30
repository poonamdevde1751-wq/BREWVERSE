
// Check Admin Login
async function checkAdmin() {
    try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (!data.user) {
            alert("Please login first.");
            window.location.href = "auth.html";
            return false;
        }

        if (data.user.role !== "admin") {
            alert("Access denied. Admin only.");
            window.location.href = "index.html";
            return false;
        }

        document.getElementById("admin-name").textContent =
            data.user.name;

        return true;

    } catch (error) {
        console.error(error);
        alert("Unable to verify admin account.");
        window.location.href = "index.html";
        return false;
    }
}

// Load Dashboard Statistics
async function loadStats() {
    try {
        const response = await fetch("/api/admin/stats");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        document.getElementById("total-users").textContent =
            data.totalUsers;

        document.getElementById("total-products").textContent =
            data.totalProducts;

        document.getElementById("total-orders").textContent =
            data.totalOrders;

    } catch (error) {
        console.error("Statistics Error:", error);
    }
}

// Load Products
async function loadProducts() {
    const table = document.getElementById("products-table");

    try {
        const response = await fetch("/api/admin/products");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        table.innerHTML = "";

        if (data.products.length === 0) {
            table.innerHTML =
                '<tr><td colspan="4">No products available.</td></tr>';
            return;
        }

        data.products.forEach(product => {
            const row = document.createElement("tr");

            const id = document.createElement("td");
            id.textContent = product.id;

            const name = document.createElement("td");
            name.textContent = product.name;

            const price = document.createElement("td");
            price.textContent =
                "₹" + Number(product.price).toFixed(2);

            const action = document.createElement("td");

            // Edit Button
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.className = "update-btn";

            editButton.addEventListener("click", () => {
                editProduct(product);
            });

            // Delete Button
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-btn";

            deleteButton.addEventListener("click", () => {
                deleteProduct(product.id);
            });

            action.append(editButton, deleteButton);
            row.append(id, name, price, action);

            table.appendChild(row);
        });

        // Apply search after loading products
        searchProducts();

    } catch (error) {
        console.error("Products Error:", error);
        table.innerHTML =
            '<tr><td colspan="4">Unable to load products.</td></tr>';
    }
}

// Product Search
function searchProducts() {
    const searchInput =
        document.getElementById("product-search");

    const searchValue = searchInput.value.toLowerCase().trim();

    const rows = document.querySelectorAll(
        "#products-table tr"
    );

    let visibleCount = 0;

    rows.forEach(row => {
        const productName =
            row.children[1]?.textContent.toLowerCase() || "";

        if (productName.includes(searchValue)) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    const oldMessage =
        document.getElementById("no-search-results");

    if (oldMessage) {
        oldMessage.remove();
    }

    if (visibleCount === 0 && rows.length > 0) {
        const messageRow = document.createElement("tr");
        messageRow.id = "no-search-results";

        const messageCell = document.createElement("td");
        messageCell.colSpan = 4;
        messageCell.textContent = "No matching products found.";

        messageRow.appendChild(messageCell);

        document.getElementById("products-table")
            .appendChild(messageRow);
    }
}

// Add Product
async function addProduct(event) {
    event.preventDefault();

    const message = document.getElementById("product-message");

    const product = {
        name: document.getElementById("product-name").value.trim(),
        description:
            document.getElementById("product-description").value.trim(),
        price: document.getElementById("product-price").value,
        image: document.getElementById("product-image").value.trim()
    };

    try {
        const response = await fetch("/api/admin/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(product)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to add product");
        }

        message.textContent = "Product added successfully!";
        message.style.color = "green";

        document.getElementById("product-form").reset();
        document.getElementById("product-search").value = "";

        await loadProducts();
        await loadStats();

    } catch (error) {
        console.error("Add Product Error:", error);
        message.textContent = error.message;
        message.style.color = "red";
    }
}

// Show Edit Product Form
function editProduct(product) {
    document.getElementById("edit-product-id").value = product.id;

    document.getElementById("edit-product-name").value =
        product.name || "";

    document.getElementById("edit-product-description").value =
        product.description || "";

    document.getElementById("edit-product-price").value =
        product.price;

    document.getElementById("edit-product-image").value =
        product.image || "";

    document.getElementById("edit-product-message").textContent = "";

    const editSection =
        document.getElementById("edit-product-section");

    editSection.hidden = false;

    editSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Update Product
async function updateProduct(event) {
    event.preventDefault();

    const productId =
        document.getElementById("edit-product-id").value;

    const message =
        document.getElementById("edit-product-message");

    const product = {
        name: document.getElementById("edit-product-name").value.trim(),
        description:
            document.getElementById("edit-product-description").value.trim(),
        price: document.getElementById("edit-product-price").value,
        image: document.getElementById("edit-product-image").value.trim()
    };

    try {
        const response = await fetch(
            "/api/admin/products/" + productId,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(product)
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to update product");
        }

        message.textContent = "Product updated successfully!";
        message.style.color = "green";

        await loadProducts();
        await loadStats();

        setTimeout(() => {
            cancelEdit();
        }, 1000);

    } catch (error) {
        console.error("Update Product Error:", error);
        message.textContent = error.message;
        message.style.color = "red";
    }
}

// Cancel Edit
function cancelEdit() {
    document.getElementById("edit-product-form").reset();

    document.getElementById("edit-product-section").hidden = true;

    document.getElementById("edit-product-message").textContent = "";
}

// Delete Product
async function deleteProduct(productId) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
        const response = await fetch(
            "/api/admin/products/" + productId,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        alert("Product deleted successfully!");

        await loadProducts();
        await loadStats();

    } catch (error) {
        console.error("Delete Error:", error);
        alert(error.message);
    }
}

// Load Customer Orders
async function loadOrders() {
    const table = document.getElementById("orders-table");

    try {
        const response = await fetch("/api/admin/orders");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        table.innerHTML = "";

        if (data.orders.length === 0) {
            table.innerHTML =
                '<tr><td colspan="9">No customer orders found.</td></tr>';
            return;
        }

        data.orders.forEach(order => {
            const row = document.createElement("tr");

            const values = [
                order.order_id,
                order.customer_name,
                order.customer_email,
                order.product_name,
                order.quantity,
                "₹" + Number(order.price).toFixed(2),
                "₹" + Number(order.total_amount).toFixed(2)
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            // Order Status
            const statusCell = document.createElement("td");

            const statusSelect = document.createElement("select");
            statusSelect.className = "status-select";

            const statuses = [
                "Pending",
                "Processing",
                "Completed",
                "Cancelled"
            ];

            statuses.forEach(status => {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;

                if (status === order.status) {
                    option.selected = true;
                }

                statusSelect.appendChild(option);
            });

            statusCell.appendChild(statusSelect);

            // Update Button
            const actionCell = document.createElement("td");

            const updateButton = document.createElement("button");
            updateButton.textContent = "Update";
            updateButton.className = "update-btn";

            updateButton.addEventListener("click", () => {
                updateOrderStatus(
                    order.order_id,
                    statusSelect.value
                );
            });

            actionCell.appendChild(updateButton);

            row.append(statusCell, actionCell);
            table.appendChild(row);
        });

    } catch (error) {
        console.error("Orders Error:", error);
        table.innerHTML =
            '<tr><td colspan="9">Unable to load orders.</td></tr>';
    }
}

// Update Order Status
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(
            "/api/admin/orders/" + orderId + "/status",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: status })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        alert("Order status updated successfully!");

        loadOrders();

    } catch (error) {
        console.error("Update Status Error:", error);
        alert(error.message);
    }
}

// Admin Logout
async function logoutAdmin() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Logout failed");
        }

        window.location.href = "auth.html";

    } catch (error) {
        alert(error.message);
    }
}

// Page Start
document.addEventListener("DOMContentLoaded", async function () {

    const isAdmin = await checkAdmin();

    if (!isAdmin) return;

    document.getElementById("product-form").addEventListener(
        "submit",
        addProduct
    );

    document.getElementById("edit-product-form").addEventListener(
        "submit",
        updateProduct
    );

    document.getElementById("cancel-edit-btn").addEventListener(
        "click",
        cancelEdit
    );

    document.getElementById("logout-btn").addEventListener(
        "click",
        logoutAdmin
    );

    // Search Event
    document.getElementById("product-search").addEventListener(
        "input",
        searchProducts
    );

    loadStats();
    loadProducts();
    loadOrders();
});
