
// Products and Cart
let products = [];
let cart = JSON.parse(localStorage.getItem("brewverseCart") || "[]");

// Save cart
function saveCart() {
    localStorage.setItem("brewverseCart", JSON.stringify(cart));
}

// Check Login and Admin Role
async function checkUserRole() {
    try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        const adminLink = document.getElementById("admin-link");

        if (adminLink && data.user && data.user.role === "admin") {
            adminLink.style.display = "inline-block";
        } else if (adminLink) {
            adminLink.style.display = "none";
        }

    } catch (error) {
        console.error("User Role Error:", error);
    }
}

// Load products from PostgreSQL
async function loadProducts() {
    const menu = document.getElementById("coffee-menu");

    try {
        const response = await fetch("/api/products");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error("Unable to load products");
        }

        products = data.products;

        displayProducts();
        displayCart();

    } catch (error) {
        console.error(error);
        menu.textContent = "Unable to load coffee menu.";
    }
}

// Display products
function displayProducts() {
    const menu = document.getElementById("coffee-menu");
    menu.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "coffee-card";

        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;

        image.onerror = function () {
            this.style.display = "none";
        };

        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.textContent = product.description || "";

        const price = document.createElement("h4");
        price.textContent = "₹" + Number(product.price).toFixed(2);

        const button = document.createElement("button");
        button.textContent = "Add to Cart";

        button.addEventListener("click", function () {
            addToCart(product.id);
        });

        card.append(image, name, description, price, button);
        menu.appendChild(card);
    });
}

// Add product to cart
function addToCart(productId) {
    const existingItem = cart.find(
        item => Number(item.productId) === Number(productId)
    );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            productId: Number(productId),
            quantity: 1
        });
    }

    saveCart();
    displayCart();

    document.getElementById("cart").scrollIntoView({
        behavior: "smooth"
    });
}

// Increase quantity
function increaseQuantity(productId) {
    const item = cart.find(
        item => Number(item.productId) === Number(productId)
    );

    if (item) {
        item.quantity++;
    }

    saveCart();
    displayCart();
}

// Decrease quantity
function decreaseQuantity(productId) {
    const item = cart.find(
        item => Number(item.productId) === Number(productId)
    );

    if (item) {
        item.quantity--;

        if (item.quantity <= 0) {
            cart = cart.filter(
                item => Number(item.productId) !== Number(productId)
            );
        }
    }

    saveCart();
    displayCart();
}

// Remove product
function removeFromCart(productId) {
    cart = cart.filter(
        item => Number(item.productId) !== Number(productId)
    );

    saveCart();
    displayCart();
}

// Display cart
function displayCart() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const cartTotal = document.getElementById("cart-total");

    cartItems.innerHTML = "";

    let total = 0;
    let totalQuantity = 0;

    cart = cart.filter(item =>
        products.some(product =>
            Number(product.id) === Number(item.productId)
        )
    );

    cart.forEach(item => {
        const product = products.find(
            product => Number(product.id) === Number(item.productId)
        );

        if (!product) return;

        const price = Number(product.price);
        const subtotal = price * item.quantity;

        total += subtotal;
        totalQuantity += item.quantity;

        const row = document.createElement("div");
        row.className = "cart-item";

        const details = document.createElement("div");
        details.className = "cart-product-details";

        const name = document.createElement("h3");
        name.textContent = product.name;

        const priceText = document.createElement("p");
        priceText.textContent = "Price: ₹" + price.toFixed(2);

        const subtotalText = document.createElement("p");
        subtotalText.textContent =
            "Subtotal: ₹" + subtotal.toFixed(2);

        details.append(name, priceText, subtotalText);

        const controls = document.createElement("div");
        controls.className = "quantity-controls";

        const minus = document.createElement("button");
        minus.textContent = "−";
        minus.addEventListener("click", () => {
            decreaseQuantity(product.id);
        });

        const quantity = document.createElement("span");
        quantity.textContent = item.quantity;

        const plus = document.createElement("button");
        plus.textContent = "+";
        plus.addEventListener("click", () => {
            increaseQuantity(product.id);
        });

        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.className = "remove-btn";
        remove.addEventListener("click", () => {
            removeFromCart(product.id);
        });

        controls.append(minus, quantity, plus, remove);
        row.append(details, controls);

        cartItems.appendChild(row);
    });

    if (totalQuantity === 0) {
        cartItems.textContent = "Your cart is empty.";
    }

    cartCount.textContent = totalQuantity;
    cartTotal.textContent = total.toFixed(2);

    saveCart();
}

// Checkout
async function checkout() {
    const message = document.getElementById("cart-message");

    if (cart.length === 0) {
        message.textContent = "Please add coffee to your cart first.";
        return;
    }

    try {
        const userResponse = await fetch("/api/auth/me");
        const userData = await userResponse.json();

        if (!userData.user) {
            alert("Please login before checkout.");
            window.location.href = "auth.html";
            return;
        }

        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: cart
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Order failed");
        }

        alert("Order placed successfully! Order ID: " + data.order.id);

        cart = [];
        saveCart();
        displayCart();

        message.textContent = "Your order has been placed successfully!";

        loadMyOrders();

    } catch (error) {
        console.error("Checkout Error:", error);
        message.textContent = error.message;
    }
}

// Display My Orders
async function loadMyOrders() {
    const ordersList = document.getElementById("orders-list");

    try {
        const response = await fetch("/api/orders");
        const data = await response.json();

        if (response.status === 401) {
            ordersList.textContent = "Please login to view your orders.";
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }

        ordersList.innerHTML = "";

        if (data.orders.length === 0) {
            ordersList.textContent = "You have not placed any orders yet.";
            return;
        }

        const groupedOrders = {};

        data.orders.forEach(item => {
            if (!groupedOrders[item.order_id]) {
                groupedOrders[item.order_id] = {
                    total: item.total_amount,
                    status: item.status,
                    date: item.created_at,
                    items: []
                };
            }

            groupedOrders[item.order_id].items.push(item);
        });

        Object.entries(groupedOrders).forEach(([orderId, order]) => {
            const card = document.createElement("div");
            card.className = "order-card";

            const heading = document.createElement("h3");
            heading.textContent = "Order #" + orderId;

            const status = document.createElement("p");
            status.textContent = "Status: " + order.status;

            const date = document.createElement("p");
            date.textContent =
                "Date: " + new Date(order.date).toLocaleString();

            const list = document.createElement("ul");

            order.items.forEach(item => {
                const li = document.createElement("li");

                li.textContent =
                    item.product_name +
                    " x " + item.quantity +
                    " - ₹" +
                    (Number(item.price) * Number(item.quantity)).toFixed(2);

                list.appendChild(li);
            });

            const total = document.createElement("h4");
            total.textContent =
                "Total: ₹" + Number(order.total).toFixed(2);

            card.append(heading, status, date, list, total);
            ordersList.appendChild(card);
        });

    } catch (error) {
        console.error("Orders Error:", error);
        ordersList.textContent = "Unable to load orders.";
    }
}

// Page Load
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("checkout-btn").addEventListener(
        "click",
        checkout
    );

    checkUserRole();
    loadProducts();
    loadMyOrders();
});
