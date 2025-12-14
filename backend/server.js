// backend/server.js
const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Serve frontend files (HTML, CSS, JS) as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Test route – to check if the backend is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CareMatch backend is running' });
});

// Test route – checks if Node can connect to MySQL
app.get('/api/test-db', async (req, res) => {
  try {
    // Simple query just to test the connection
    const [rows] = await db.query('SELECT 1 AS test');
    res.json({ status: 'ok', db: rows });
  } catch (err) {
    console.error('DB test error:', err.code, err.message);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Belong to Contact Us in Section 6
app.post("/api/contact", (req, res) => {
  // Later: save to DB / send email
  console.log("Contact message:", req.body);
  res.json({ status: "ok" });
});


// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});