
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Get all coffee products
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id ASC"
        );

        res.json({
            success: true,
            total: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        console.log("PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch products",
            error: error.message
        });
    }
});

module.exports = router;
