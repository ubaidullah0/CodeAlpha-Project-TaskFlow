const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Running database schema migrations...');
    await pool.query(schema);
    console.log('Database schema created/updated successfully.');
  } catch (err) {
    console.error('Error running migrations:', err);
  }
}

module.exports = runMigrations;
