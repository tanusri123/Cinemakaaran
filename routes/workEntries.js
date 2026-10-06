const express = require("express");
const router = express.Router();
const pool = require("../db/database");

// GET all work entries
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM work_entries ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch work entries" });
    }
});

// CREATE a work entry
router.post("/", async (req, res) => {
    const {
        id, projectId, category, subtype, quantity, unitPrice, status
    } = req.body;

    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (
        !id || !projectId || !category || !subtype ||
        quantity == null || unitPrice == null ||
        !Number.isFinite(qty) || qty <= 0 ||
        !Number.isFinite(price) || price < 0
    ) {
        return res.status(400).json({
            error: "Provide all required fields, a positive quantity, and a non-negative price"
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO work_entries
       (id, project_id, category, subtype, quantity, unit_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [id, projectId, category, subtype, qty, price, status]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create work entry" });
    }
});

// UPDATE a work entry
router.put("/:id", async (req, res) => {
    const {
        projectId, category, subtype, quantity, unitPrice, status
    } = req.body;

    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (
        !projectId || !category || !subtype ||
        quantity == null || unitPrice == null ||
        !Number.isFinite(qty) || qty <= 0 ||
        !Number.isFinite(price) || price < 0
    ) {
        return res.status(400).json({
            error: "Provide all required fields, a positive quantity, and a non-negative price"
        });
    }

    try {
        const result = await pool.query(
            `UPDATE work_entries
       SET project_id = $1,
           category = $2,
           subtype = $3,
           quantity = $4,
           unit_price = $5,
           status = $6
       WHERE id = $7
       RETURNING *`,
            [projectId, category, subtype, qty, price, status, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Work entry not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update work entry" });
    }
});

// DELETE a work entry
router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM work_entries WHERE id = $1 RETURNING *",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Work entry not found" });
        }

        res.json({ message: "Work entry deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete work entry" });
    }
});

module.exports = router;