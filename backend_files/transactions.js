const express = require("express");
const { Client } = require("pg");

const app = express();
app.use(express.json()); // Middleware for parsing JSON requests

// PostgreSQL client setup
const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "test",
  password: "1999",
  port: 5433,
});

// Connect to DB and initialize table
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_type VARCHAR(10) CHECK (transaction_type IN ('income', 'expense')) NOT NULL,
        transaction_date DATE NOT NULL
      )
    `);
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

connectDB();

/* ========== CRUD OPERATIONS ========== */

// 1️⃣ **GET all transactions**
app.get("/transactions", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM financial_transactions ORDER BY transaction_date DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/transtotal/:user_id", async (req, res) => {
    try {
      const { user_id } = req.params;
  
      // Query to fetch all transactions and calculate total income & expenses
      const query = `
        SELECT 
          user_id,
          SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) AS total_income,
          SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS total_expense,
          (SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) -
           SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END)) AS balance
        FROM financial_transactions
        WHERE user_id = $1
        GROUP BY user_id
      `;
  
      const result = await client.query(query, [user_id]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No transactions found for this user." });
      }
  
      res.json(result.rows[0]); // Return total income, expense, and balance
    } catch (err) {
      console.error("Error fetching transaction summary:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
// 2️⃣ **POST a new transaction**
app.post("/transactions", async (req, res) => {
  try {
    const { user_id, category, amount, transaction_type, transaction_date } = req.body;

    const query = `
      INSERT INTO financial_transactions (user_id, category, amount, transaction_type, transaction_date) 
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    
    const values = [user_id, category, amount, transaction_type, transaction_date];

    const result = await client.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding transaction:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3️⃣ **PUT (Update) a transaction**
app.put("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, category, amount, transaction_type, transaction_date } = req.body;

    const query = `
      UPDATE financial_transactions 
      SET user_id = $1, category = $2, amount = $3, transaction_type = $4, transaction_date = $5 
      WHERE id = $6 RETURNING *`;

    const values = [user_id, category, amount, transaction_type, transaction_date, id];

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 4️⃣ **DELETE a transaction**
app.delete("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query("DELETE FROM financial_transactions WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});