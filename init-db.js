/**
 * Database initialization script
 * Run this script to initialize the database schema
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    // Connect to MySQL without specifying database
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await connection.query(schema);

        console.log('✓ Database initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err);
        throw err;
    } finally {
        await connection.end();
    }
}

// Run if executed directly
if (require.main === module) {
    initDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { initDatabase };