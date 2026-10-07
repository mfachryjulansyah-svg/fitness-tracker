// Menjalankan database/schema.sql secara otomatis lewat Node.js
// Jalankan dengan: npm run init-db
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const dbName = process.env.DB_NAME || 'fitness_tracker';
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Database dipilih dari konfigurasi koneksi, jadi schema tidak boleh
  // memaksa USE fitness_tracker saat DB_NAME memakai nama lain.
  const sql = schema
    .replace(/CREATE DATABASE IF NOT EXISTS fitness_tracker[\s\S]*?;/i, '')
    .replace(/USE fitness_tracker\s*;/i, '');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log('Menghubungkan ke MySQL...');
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${dbName}\``);
  await connection.query(sql);

  console.log(`✅ Database "${dbName}" berhasil dibuat & diisi data awal.`);
  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  const detail = [err.code, err.sqlMessage || err.message].filter(Boolean).join(': ');
  console.error('❌ Gagal inisialisasi database:', detail || err);
  process.exit(1);
});
