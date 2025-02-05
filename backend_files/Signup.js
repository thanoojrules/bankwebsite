const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// PostgreSQL Pool
const pool = new Pool({
    user: "postgres",
  host: "localhost",
  database: "test",
  password: "1999",
  port: 5433
});

// Routes


const cors = require("cors");

app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Enable CORS (allow all origins)
app.use(cors());

// Parse JSON bodies
app.use(express.json());    

// Create a new user
app.post("/users", async (req, res) => {
    const { email, username, password } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO users ( email, username, password) VALUES ($1, $2, $3) RETURNING *",
            [email, username, password]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Read all users
app.get("/users", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Read a specific user by ID
app.get("/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Update a user
app.put("/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
            [name, email, id]
        );
        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// Delete a user
app.delete("/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: "User deleted successfully" });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password." });
    }
    
    // Query user from the DB
    const queryText = "SELECT email, password, username FROM users WHERE email = $1";
    const queryValues = [email];

    const result = await pool.query(queryText, queryValues);

    if (result.rows.length === 0) {
      // User not found
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // Compare the hashed password in DB with the provided plain text password
    const dbUser = result.rows[0];
    
    // for encrypted passwords
    //const match = await bcrypt.compare(password, dbUser.password);
    if (dbUser.password !== password) {
      // Invalid password
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // Successful login
    return res.status(200).json({ message: `Welcome, ${dbUser.username}!` });
  } catch (error) {
    console.error("Error during /login:", error);
    res.status(500).json({ message: "Server error." });
  }
});
// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
