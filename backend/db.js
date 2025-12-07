// Import mysql2 in promise mode so we can use async/await
const mysql = require('mysql2/promise');

// Load environment variables from .env file (e.g. DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
require('dotenv').config(); 

// Create a reusable connection pool to the MySQL database
const pool = mysql.createPool({
  // Use values from .env if they exist, otherwise fall back to local defaults
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'carematch_db'
});

// Export the pool so other files (routes/controllers) can run queries using it
module.exports = pool;