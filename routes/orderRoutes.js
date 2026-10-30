
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Check whether user is logged in
function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please login first"
        });
    }

    next();
}

// Place Order
router.post("/", isLoggedIn, async (req, res) => {
    const client = await pool.connect();

    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty"
            });
        }

        await client.query("BEGIN");

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(quantity) ||
                quantity <= 0 ||
                quantity > 100
            ) {
                throw new Error("Invalid product or quantity");
            }

            const productResult = await client.query(
                "SELECT id, price FROM products WHERE id = $1",
                [productId]
            );

            if (productResult.rows.length === 0) {
                throw new Error("Product not found");
            }

            const price = Number(productResult.rows[0].price);
            totalAmount += price * quantity;

            orderItems.push({
                productId,
                quantity,
                price
            });
        }

        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total_amount, status)
             VALUES ($1, $2, 'Pending')
             RETURNING id, total_amount, status, created_at`,
            [req.session.user.id, totalAmount]
        );

        const order = orderResult.rows[0];

        for (const item of orderItems) {
            await client.query(
                `INSERT INTO order_items
                 (order_id, product_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [
                    order.id,
                    item.productId,
                    item.quantity,
                    item.price
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            order
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.log("ORDER ERROR:", error);

        res.status(400).json({
            success: false,
            message: error.message || "Unable to place order"
        });

    } finally {
        client.release();
    }
});

// Get Logged-in User Orders
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                o.id AS order_id,
                o.total_amount,
                o.status,
                o.created_at,
                oi.product_id,
                p.name AS product_name,
                oi.quantity,
                oi.price
             FROM orders o
             JOIN order_items oi ON o.id = oi.order_id
             JOIN products p ON oi.product_id = p.id
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC, o.id DESC`,
            [req.session.user.id]
        );

        res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {
        console.log("FETCH ORDERS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch orders"
        });
    }
});

module.exports = router;
