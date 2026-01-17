/**
 * @file db.js
 * @description Manages the connection to our external MySQL database hosted on Aiven.
 * @notes
 * - Uses a Connection Pool to handle multiple requests efficiently and improve performance.
 * - Securely loads database credentials from environment variables (.env).
 * - Implements SSL encryption to ensure a secure connection between the server and the database.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// We use 'dotenv' to load environment variables. 
// This keeps our database credentials secure and separate from the source code.
require('dotenv').config(); 


// Handle SSL Certificate path for secure connection
const caPath = process.env.DB_SSL_CA
  ? path.resolve(process.env.DB_SSL_CA)
  : null;

// Create a connection pool to allow multiple simultaneous connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // SSL configuration is required by Aiven for a secure handshake
  ssl: caPath
    ? {
        ca: fs.readFileSync(caPath),
        rejectUnauthorized: true,
      }
    : undefined,
});

// Export the pool so it can be used in other parts of the backend (server.js)
module.exports = pool;