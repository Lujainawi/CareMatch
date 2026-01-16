// // Import mysql2 in promise mode so we can use async/await
// const mysql = require('mysql2/promise');

// // Load environment variables from .env file (e.g. DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
// require('dotenv').config(); 

// // Create a reusable connection pool to the MySQL database
// const pool = mysql.createPool({
//   // Use values from .env if they exist, otherwise fall back to local defaults
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'carematch_db'
// });

// // Export the pool so other files (routes/controllers) can run queries using it
// module.exports = pool;


// backend/db.js that match the new .env configuration for Aiven PostgreSQL Database
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const caPath = process.env.DB_SSL_CA
  ? path.resolve(process.env.DB_SSL_CA)
  : null;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: caPath
    ? {
        ca: fs.readFileSync(caPath),
        rejectUnauthorized: true,
      }
    : undefined,
});

module.exports = pool;