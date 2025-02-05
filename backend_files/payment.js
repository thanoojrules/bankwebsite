const express = require('express');
const { Client } = require('pg');
const moment = require('moment');
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

// Connect to PostgreSQL and initialize the database
async function initializeDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Create the payment reminders table if it does not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_reminders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        due_date DATE NOT NULL,
        priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high')) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('pending', 'completed')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Payment reminders table created or already exists');
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
}

initializeDatabase();

// Middleware
app.use(express.json());

// POST: Create a new payment reminder
app.post('/payment-reminders', async (req, res) => {
  try {
    const { title, due_date, priority, status } = req.body;

    // Validate that the due_date is in the future
    if (moment(due_date).isBefore(moment(), 'day')) {
      return res.status(400).json({ error: 'Due date cannot be in the past' });
    }

    // Insert new payment reminder into the database
    const result = await client.query(
      `INSERT INTO payment_reminders (title, due_date, priority, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, due_date, priority, status]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ error: 'Failed to create payment reminder' });
  }
});

// GET: Fetch all payment reminders with optional filters
app.get('/payment-reminders', async (req, res) => {
  try {
    const { due_date, status, priority, sort_by } = req.query;

    // Build dynamic filter object
    const filters = [];
    const filterValues = [];
    
    // Dynamically add filters based on query parameters
    if (due_date) {
      filters.push('due_date = $' + (filters.length + 1));
      filterValues.push(due_date);
    }
    if (status) {
      filters.push('status = $' + (filters.length + 1));
      filterValues.push(status);
    }
    if (priority) {
      filters.push('priority = $' + (filters.length + 1));
      filterValues.push(priority);
    }

    // If filters exist, add WHERE clause, else leave it empty
    let filterQuery = '';
    if (filters.length > 0) {
      filterQuery = 'WHERE ' + filters.join(' AND ');
    }

    // Sorting logic
    let orderQuery = 'ORDER BY due_date ASC'; // Default sorting by due date
    if (sort_by && sort_by === 'priority') {
      orderQuery = 'ORDER BY priority ASC';
    }

    const result = await client.query(
      `SELECT * FROM payment_reminders ${filterQuery} ${orderQuery}`,
      filterValues
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET error:', err);
    res.status(500).json({ error: 'Failed to fetch payment reminders' });
  }
});

// PUT: Update a payment reminder by ID
app.put('/payment-reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, due_date, priority, status } = req.body;

    // Validate that the due_date is in the future
    if (moment(due_date).isBefore(moment(), 'day')) {
      return res.status(400).json({ error: 'Due date cannot be in the past' });
    }

    const result = await client.query(
      `UPDATE payment_reminders SET
         title = $1, due_date = $2, priority = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, due_date, priority, status, id]
    );

    result.rows.length > 0
      ? res.json(result.rows[0])
      : res.status(404).json({ error: 'Payment reminder not found' });
  } catch (err) {
    console.error('PUT error:', err);
    res.status(500).json({ error: 'Failed to update payment reminder' });
  }
});

// PATCH: Mark a payment reminder as completed
app.patch('/payment-reminders/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      `UPDATE payment_reminders SET
         status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    result.rows.length > 0
      ? res.json({ message: 'Payment reminder marked as completed' })
      : res.status(404).json({ error: 'Payment reminder not found' });
  } catch (err) {
    console.error('PATCH error:', err);
    res.status(500).json({ error: 'Failed to mark payment reminder as completed' });
  }
});

// DELETE: Delete a payment reminder by ID
app.delete('/payment-reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM payment_reminders WHERE id = $1 RETURNING *',
      [id]
    );

    result.rows.length > 0
      ? res.json({ message: 'Payment reminder deleted successfully' })
      : res.status(404).json({ error: 'Payment reminder not found' });
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete payment reminder' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});