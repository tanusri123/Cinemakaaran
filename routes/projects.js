const express = require("express");
const router = express.Router();

const pool = require("../db/database");

// GET all projects
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM projects ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch projects"
        });
    }
});

// GET one project
router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM projects WHERE id = $1",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to fetch project"
        });
    }
});

// CREATE project
router.post("/", async (req, res) => {
    try {
        const {
            id,
            clientId,
            name,
            month,
            type,
            status
        } = req.body;

        const result = await pool.query(
            `INSERT INTO projects
            (id, client_id, name, month, type, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                id,
                clientId,
                name,
                month,
                type,
                status
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to create project"
        });
    }
});

// UPDATE project
router.put("/:id", async (req, res) => {
    try {
        const {
            clientId,
            name,
            month,
            type,
            status
        } = req.body;

        const result = await pool.query(
            `UPDATE projects
             SET client_id = $1,
                 name = $2,
                 month = $3,
                 type = $4,
                 status = $5
             WHERE id = $6
             RETURNING *`,
            [
                clientId,
                name,
                month,
                type,
                status,
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to update project"
        });
    }
});

// DELETE project
router.delete("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM projects WHERE id = $1 RETURNING *",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        res.json({
            message: "Project deleted successfully",
            project: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to delete project"
        });
    }
});

module.exports = router;