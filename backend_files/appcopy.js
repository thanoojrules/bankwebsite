const express = require('express');
const { Client } = require('pg');
const app = express();
const port = 3000;

// PostgreSQL configuration
const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "test",
  password: "1999",
  port: 5433
});

// Connect to PostgreSQL and initialize database
async function initializeDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        c_id SERIAL PRIMARY KEY,
        savings INTEGER NOT NULL,
        chequing INTEGER NOT NULL,
        creditcard INTEGER NOT NULL,
        scenepoints INTEGER NOT NULL,
        balance INTEGER NOT NULL
      )
    `);

    // Insert sample data if table is empty
    const res = await client.query('SELECT COUNT(*) FROM accounts');
    if (parseInt(res.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO accounts (savings, chequing, creditcard, scenepoints, balance)
        VALUES 
          (3000, 2000, 200, 23000, 5000),
          (4000, 2000, 300, 5467364, 6000),
          (5000, 2000, 400, 4677, 7000)
      `);
      console.log('Inserted initial sample data');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

initializeDatabase();

// Middleware
app.use(express.json());

// GET all accounts
app.get('/accounts', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM accounts ORDER BY c_id');
    res.json(result.rows);
  } catch (err) {
    console.error('GET error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST new account
app.post('/accounts', async (req, res) => {
  try {
    const { savings, chequing, creditcard, scenepoints, balance } = req.body;
    const result = await client.query(
      `INSERT INTO accounts 
       (savings, chequing, creditcard, scenepoints, balance)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [savings, chequing, creditcard, scenepoints, balance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// UPDATE account
app.put('/accounts/:c_id', async (req, res) => {
  try {
    const { c_id } = req.params;
    const { savings, chequing, creditcard, scenepoints, balance } = req.body;
    
    const result = await client.query(
      `UPDATE accounts SET
        savings = $1,
        chequing = $2,
        creditcard = $3,
        scenepoints = $4,
        balance = $5
       WHERE c_id = $6
       RETURNING *`,
      [savings, chequing, creditcard, scenepoints, balance, c_id]
    );

    result.rows.length > 0
      ? res.json(result.rows[0])
      : res.status(404).json({ error: 'Account not found' });
  } catch (err) {
    console.error('PUT error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE account
app.delete('/accounts/:c_id', async (req, res) => {
  try {
    const { c_id } = req.params;
    const result = await client.query(
      'DELETE FROM accounts WHERE c_id = $1 RETURNING *',
      [c_id]
    );

    result.rows.length > 0
      ? res.json({ message: 'Account deleted successfully' })
      : res.status(404).json({ error: 'Account not found' });
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});