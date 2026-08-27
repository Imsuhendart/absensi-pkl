const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./absensi.db', (err) => {
    if (err) console.error('Gagal membuka database:', err.message);
    else console.log('Terhubung ke database SQLite.');
});

db.serialize(() => {
    // Tabel Users (Login)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    `);

    // Tabel Absensi
    db.run(`
        CREATE TABLE IF NOT EXISTS absensi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            status TEXT NOT NULL,
            kegiatan TEXT,
            foto TEXT,
            lokasi TEXT,
            waktu DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

module.exports = db;