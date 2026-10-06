const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const pool = require("../db/database");

// GET all payments
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id,
             invoice_id AS "invoiceId",
             amount,
             TO_CHAR(payment_date, 'YYYY-MM-DD') AS date
      FROM payments
      ORDER BY created_at DESC
    `);

        res.json(result.rows.map(payment => ({
            ...payment,
            amount: Number(payment.amount)
        })));
    } catch (error) {
        console.error("Payment loading failed:", error);
        res.status(500).json({ error: "Failed to load payments" });
    }
});

// CREATE a payment
router.post("/", async (req, res) => {
    const { invoiceId, amount, date } = req.body;
    const paymentAmount = Number(amount);

    if (
        !invoiceId || !date ||
        !Number.isFinite(paymentAmount) || paymentAmount <= 0
    ) {
        return res.status(400).json({
            error: "Invoice, date, and a positive payment amount are required"
        });
    }

    let connection;

    try {
        connection = await pool.connect();
        await connection.query("BEGIN");

        // Lock the invoice while checking and recording its payment.
        const invoice = await connection.query(
            "SELECT id FROM invoices WHERE id = $1 FOR UPDATE",
            [invoiceId]
        );

        if (invoice.rows.length === 0) {
            await connection.query("ROLLBACK");
            return res.status(404).json({ error: "Invoice not found" });
        }

        const balance = await connection.query(
            `SELECT
         COALESCE((
           SELECT SUM(quantity * unit_price)
           FROM invoice_items WHERE invoice_id = $1
         ), 0)
         - COALESCE((
           SELECT SUM(amount)
           FROM payments WHERE invoice_id = $1
         ), 0) AS pending`,
            [invoiceId]
        );

        const pending = Number(balance.rows[0].pending);

        if (paymentAmount > pending) {
            await connection.query("ROLLBACK");
            return res.status(400).json({
                error: "Payment exceeds the outstanding balance"
            });
        }

        const result = await connection.query(
            `INSERT INTO payments
       (id, invoice_id, amount, payment_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, invoice_id AS "invoiceId", amount,
                 TO_CHAR(payment_date, 'YYYY-MM-DD') AS date`,
            [randomUUID(), invoiceId, paymentAmount, date]
        );

        await connection.query("COMMIT");

        res.status(201).json({
            ...result.rows[0],
            amount: Number(result.rows[0].amount)
        });
    } catch (error) {
        if (connection) {
            await connection.query("ROLLBACK").catch(console.error);
        }

        console.error("Payment creation failed:", error);
        res.status(500).json({ error: "Failed to save payment" });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;