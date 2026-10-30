
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// USER REGISTRATION
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            user: result.rows[0]
        });

    } catch (error) {
        console.log("REGISTRATION ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
});

// USER LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            message: "Login successful!",
            user: req.session.user
        });

    } catch (error) {
        console.log("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

// CHECK LOGIN STATUS
router.get("/me", (req, res) => {
    res.json({
        success: true,
        user: req.session.user || null
    });
});

// GET CUSTOMER PROFILE
router.get("/profile", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, role, created_at
             FROM users
             WHERE id = $1`,
            [req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.log("PROFILE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch profile"
        });
    }
});

// UPDATE CUSTOMER PROFILE
router.put("/profile", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        const name = req.body.name?.trim();
        const email = req.body.email?.trim().toLowerCase();

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required"
            });
        }

        const existingUser = await pool.query(
            `SELECT id FROM users
             WHERE email = $1 AND id != $2`,
            [email, req.session.user.id]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already used by another account"
            });
        }

        const result = await pool.query(
            `UPDATE users
             SET name = $1, email = $2
             WHERE id = $3
             RETURNING id, name, email, role, created_at`,
            [name, email, req.session.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        req.session.user.name = result.rows[0].name;
        req.session.user.email = result.rows[0].email;

        res.json({
            success: true,
            message: "Profile updated successfully!",
            user: result.rows[0]
        });

    } catch (error) {
        console.log("PROFILE UPDATE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update profile"
        });
    }
});

// USER LOGOUT
router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true,
            message: "Logout successful"
        });
    });
});

module.exports = router;
