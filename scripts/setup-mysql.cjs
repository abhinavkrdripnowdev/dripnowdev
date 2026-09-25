require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const name = process.env.DB_NAME || 'dripnow';
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Invalid database name');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectTimeout: 5000 });
  try { await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); console.log(`Database ${name} is ready`); }
  finally { await connection.end(); }
})().catch(error => { console.error(`MySQL setup failed: ${error.code || error.message}`); process.exitCode = 1; });
