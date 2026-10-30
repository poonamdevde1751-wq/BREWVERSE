
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Check Admin Login
function isAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please login first"
        });
    }

    if (req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin only."
        });
    }

    next();
}

// Apply Admin Security
router.use(isAdmin);

// Dashboard Statistics
router.get("/stats", async (req, res) => {
    try {
        const users = await pool.query("SELECT COUNT(*) FROM users");
        const products = await pool.query("SELECT COUNT(*) FROM products");
        const orders = await pool.query("SELECT COUNT(*) FROM orders");

        res.json({
            success: true,
            totalUsers: Number(users.rows[0].count),
            totalProducts: Number(products.rows[0].count),
            totalOrders: Number(orders.rows[0].count)
        });

    } catch (error) {
        console.log("ADMIN STATS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load dashboard statistics"
        });
    }
});

// View All Products
router.get("/products", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json({
            success: true,
            products: result.rows
        });

    } catch (error) {
        console.log("ADMIN PRODUCTS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch products"
        });
    }
});

// Add New Product
router.post("/products", async (req, res) => {
    try {
        const { name, description, price, image } = req.body;

        const productName = String(name || "").trim();
        const productDescription = String(description || "").trim();
        const productImage = String(image || "").trim();
        const productPrice = Number(price);

        if (!productName || !Number.isFinite(productPrice) || productPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid product name and price"
            });
        }

        const result = await pool.query(
            `INSERT INTO products (name, description, price, image)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [productName, productDescription, productPrice, productImage]
        );

        res.status(201).json({
            success: true,
            message: "Product added successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.log("ADD PRODUCT ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to add product"
        });
    }
});

// Edit Existing Product
router.put("/products/:id", async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const { name, description, price, image } = req.body;

        const productName = String(name || "").trim();
        const productDescription = String(description || "").trim();
        const productImage = String(image || "").trim();
        const productPrice = Number(price);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (!productName || !Number.isFinite(productPrice) || productPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid product name and price"
            });
        }

        const result = await pool.query(
            `UPDATE products
             SET name = $1,
                 description = $2,
                 price = $3,
                 image = $4
             WHERE id = $5
             RETURNING *`,
            [
                productName,
                productDescription,
                productPrice,
                productImage,
                productId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully",
            product: result.rows[0]
        });

    } catch (error) {
        console.log("EDIT PRODUCT ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update product"
        });
    }
});

// Delete Product
router.delete("/products/:id", async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const result = await pool.query(
            "DELETE FROM products WHERE id = $1 RETURNING id",
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.log("DELETE PRODUCT ERROR:", error);

        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "This product is already included in an order and cannot be deleted."
            });
        }

        res.status(500).json({
            success: false,
            message: "Unable to delete product"
        });
    }
});

// View All Customer Orders
router.get("/orders", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                o.id AS order_id,
                u.name AS customer_name,
                u.email AS customer_email,
                p.name AS product_name,
                oi.quantity,
                oi.price,
                o.total_amount,
                o.status,
                o.created_at
             FROM orders o
             JOIN users u ON o.user_id = u.id
             JOIN order_items oi ON o.id = oi.order_id
             JOIN products p ON oi.product_id = p.id
             ORDER BY o.created_at DESC, o.id DESC`
        );

        res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {
        console.log("ADMIN ORDERS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch customer orders"
        });
    }
});

// Update Order Status
router.patch("/orders/:id/status", async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        const allowedStatuses = [
            "Pending",
            "Processing",
            "Completed",
            "Cancelled"
        ];

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status"
            });
        }

        const result = await pool.query(
            `UPDATE orders
             SET status = $1
             WHERE id = $2
             RETURNING id, status`,
            [status, orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order status updated successfully",
            order: result.rows[0]
        });

    } catch (error) {
        console.log("UPDATE STATUS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update order status"
        });
    }
});

module.exports = router;
