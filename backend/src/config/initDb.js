const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('Creating database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'maxta_erp'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'maxta_erp'}`);

    console.log('Running schema...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);

    console.log('Running schema patch...');
    const patch = fs.readFileSync(path.join(__dirname, 'schema_patch.sql'), 'utf8');
    // Execute patch statements one at a time
    const statements = patch.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (e) {
        // Ignore duplicate column/table/key errors
        if (e.message.includes('Duplicate column') || e.message.includes('already exists') || e.message.includes('Duplicate entry')) {
          // Expected on re-run
        } else {
          console.warn('Patch warning:', stmt.substring(0, 60), '|', e.message.substring(0, 80));
        }
      }
    }

    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active)
      VALUES ('admin', 'admin@maxtagroup.com', ?, 'Admin', 'User', 'admin', TRUE)
      ON DUPLICATE KEY UPDATE username=username
    `, [passwordHash]);

    console.log('Creating company info...');
    await connection.query(`
      INSERT INTO company_info (company_name, city, state, country, phone)
      VALUES ('Max TA Group LLC', 'New York', 'NY', 'USA', '')
      ON DUPLICATE KEY UPDATE company_name=company_name
    `);

    console.log('Database initialized successfully!');
    console.log('Admin login: admin / admin123');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initDatabase();
