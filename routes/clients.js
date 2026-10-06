const express = require("express");
const router = express.Router();

const pool = require("../db/database");

// GET all clients
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM clients ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});

// GET one client
router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM clients WHERE id = $1",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch client" });
    }
});

// CREATE client
router.post("/", async (req, res) => {
    try {
        const { id, name, contact, phone, email } = req.body;

        const result = await pool.query(
            `INSERT INTO clients
            (id, name, contact, phone, email)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [id, name, contact, phone, email]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create client" });
    }
});

// UPDATE client
router.put("/:id", async (req, res) => {
    try {
        const { name, contact, phone, email } = req.body;

        const result = await pool.query(
            `UPDATE clients
             SET name = $1,
                 contact = $2,
                 phone = $3,
                 email = $4
             WHERE id = $5
             RETURNING *`,
            [name, contact, phone, email, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update client" });
    }
});

// DELETE client
router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM clients WHERE id = $1 RETURNING *",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Client not found" });
        }

        res.json({
            message: "Client deleted successfully",
            client: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete client" });
    }
});

module.exports = router;