const mysql = require('mysql2/promise');
require('dotenv').config();
require('./security');
for (const name of ['DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!process.env[name] || /^(change|replace|example)/i.test(process.env[name])) throw new Error(`${name} must be explicitly configured`);
}

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

// ✅ Create a connection pool instead of a single connection
const pool = mysql.createPool(dbConfig);

// ✅ Export a function to get a pooled connection
async function getConnection() {
    return await pool.getConnection();
}

module.exports = { getConnection, pool, dbConfig };
