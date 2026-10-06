const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const pool = require("../db/database");

// GET invoices, including their items and payments
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        i.id,
        i.number,
        i.client_id AS "clientId",
        TO_CHAR(i.invoice_date, 'YYYY-MM-DD') AS date,
        i.created_at AS "createdAt",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', it.id,
              'workEntryId', it.work_entry_id,
              'description', it.description,
              'qty', it.quantity,
              'unitPrice', it.unit_price
            )
            ORDER BY it.id
          )
          FROM invoice_items it
          WHERE it.invoice_id = i.id
        ), '[]'::json) AS items,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'amount', p.amount,
              'date', TO_CHAR(p.payment_date, 'YYYY-MM-DD')
            )
            ORDER BY p.created_at, p.id
          )
          FROM payments p
          WHERE p.invoice_id = i.id
        ), '[]'::json) AS payments
      FROM invoices i
      ORDER BY i.created_at DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Invoice loading failed:", error);
        res.status(500).json({ error: "Failed to load invoices" });
    }
});

// CREATE an invoice with its items
router.post("/", async (req, res) => {
    const { id, number, clientId, date, items } = req.body;

    if (
        !id || !number || !clientId || !date ||
        !Array.isArray(items) || items.length === 0
    ) {
        return res.status(400).json({
            error: "Invoice details and at least one item are required"
        });
    }

    const validItems = items.every(item =>
        item &&
        typeof item.workEntryId === "string" &&
        item.workEntryId.length > 0 &&
        typeof item.description === "string" &&
        item.description.trim().length > 0 &&
        item.qty != null &&
        item.unitPrice != null &&
        Number.isFinite(Number(item.qty)) &&
        Number(item.qty) > 0 &&
        Number.isFinite(Number(item.unitPrice)) &&
        Number(item.unitPrice) >= 0
    );

    if (!validItems) {
        return res.status(400).json({
            error: "Each item needs a work entry, description, positive quantity, and non-negative price"
        });
    }

    let connection;

    try {
        connection = await pool.connect();
        await connection.query("BEGIN");

        // Verify that every selected work entry belongs to this client.
        for (const item of items) {
            const work = await connection.query(
                `SELECT w.id
         FROM work_entries w
         JOIN projects p ON p.id = w.project_id
         WHERE w.id = $1 AND p.client_id = $2`,
                [item.workEntryId, clientId]
            );

            if (work.rows.length === 0) {
                await connection.query("ROLLBACK");
                return res.status(400).json({
                    error: "A selected work entry does not belong to this client"
                });
            }
        }

        const result = await connection.query(
            `INSERT INTO invoices
       (id, number, client_id, invoice_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, number, client_id AS "clientId",
                 TO_CHAR(invoice_date, 'YYYY-MM-DD') AS date,
                 created_at AS "createdAt"`,
            [id, number, clientId, date]
        );

        const savedItems = [];

        for (const item of items) {
            const saved = await connection.query(
                `INSERT INTO invoice_items
         (id, invoice_id, work_entry_id, description,
          quantity, unit_price, amount)
         VALUES (
  $1, $2, $3, $4,
  $5::numeric,
  $6::numeric,
  $5::numeric * $6::numeric
)
         RETURNING id, work_entry_id AS "workEntryId",
                   description, quantity AS qty,
                   unit_price AS "unitPrice"`,
                [
                    randomUUID(),
                    id,
                    item.workEntryId,
                    item.description,
                    Number(item.qty),
                    Number(item.unitPrice)
                ]
            );

            savedItems.push({
                ...saved.rows[0],
                qty: Number(saved.rows[0].qty),
                unitPrice: Number(saved.rows[0].unitPrice)
            });
        }

        await connection.query("COMMIT");

        res.status(201).json({
            ...result.rows[0],
            items: savedItems,
            payments: []
        });
    } catch (error) {
        if (connection) {
            await connection.query("ROLLBACK").catch(console.error);
        }

        console.error("Invoice creation failed:", error);
        res.status(500).json({ error: "Failed to create invoice" });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;