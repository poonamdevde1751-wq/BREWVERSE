
const express = require("express");
const path = require("path");
const session = require("express-session");
const pool = require("./config/db");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || "brewverse-local-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// Routes
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Server Test
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "BREWVERSE Server is running!"
    });
});

// Database Test
app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "PostgreSQL Connected Successfully!",
            time: result.rows[0].now
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`BREWVERSE running at http://localhost:${PORT}`);
});
