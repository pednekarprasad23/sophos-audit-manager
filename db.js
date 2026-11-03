/**
 * Database connection module
 */

const mysql = require('mysql2/promise');

let db;

// Initialize database connection
async function initDb() {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'db',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'audit_user',
            password: process.env.DB_PASSWORD || 'audit_user_pass_2024',
            database: process.env.DB_NAME || 'sophos_audit',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ssl: false
        });
        console.log('Connected to database');
        return db;
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
}

// Get database connection
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}

module.exports = { initDb, getDb };