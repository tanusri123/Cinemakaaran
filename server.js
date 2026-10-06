const express = require("express");
const projectsRoutes = require('./routes/projects');
const workEntriesRouter = require("./routes/workEntries");
const invoicesRouter = require("./routes/invoices");
const paymentsRouter = require("./routes/payments");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db/database");
const clientsRouter = require("./routes/clients");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/clients", clientsRouter);
app.use('/api/projects', projectsRoutes);
app.use("/api/work-entries", workEntriesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/payments", paymentsRouter);
app.use(
    express.static(path.join(__dirname, "../frontend"))
);

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connection successful!",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "127.0.0.1", () => {
    console.log(`App running at http://localhost:${PORT}`);
});