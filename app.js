const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

// Fungsi inisialisasi tabel otomatis (Absensi & Users/Siswa)
async function initDB() {
  try {
    const client = await pool.connect();
    
    // Tabel Absensi
    await client.query(`
      CREATE TABLE IF NOT EXISTS absensi (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        koordinat TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel Users (Akun Siswa yang diatur oleh Admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nama_lengkap TEXT NOT NULL,
        kelas TEXT NOT NULL,
        jurusan TEXT NOT NULL
      )
    `);

    // Masukkan akun default contoh jika tabel users masih kosong (Bisa ditambah oleh Admin nantinya)
    const checkUser = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(checkUser.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO users (username, password, nama_lengkap, kelas, jurusan) 
        VALUES ('ahmadfauzi', '123456', 'Ahmad Fauzi', 'XI TKJT 1', 'Teknik Komputer & Jaringan')
      `);
    }

    client.release();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}
initDB();

// Halaman Utama / Dashboard
app.get('/', async (req, res) => {
  const username = req.query.user || null;
  let currentUser = null;
  let absensiList = [];

  try {
    const client = await pool.connect();

    if (username) {
      const userResult = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      if (userResult.rows.length > 0) {
        currentUser = userResult.rows[0];
      }
    }

    const result = await client.query('SELECT * FROM absensi ORDER BY created_at DESC');
    absensiList = result.rows;

    client.release();
  } catch (err) {
    console.error('Error fetching data:', err);
  }

  res.render('index', { 
    title: 'Absensi PKL - SMKN 1 Sukaluyu',
    user: currentUser,
    absensiList: absensiList 
  });
});

// Halaman Login
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - Absensi PKL', error: null });
});

// Proses Login (Mengecek akun yang terdaftar di Database)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2', 
      [username, password]
    );
    client.release();

    if (result.rows.length > 0) {
      res.redirect(`/?user=${encodeURIComponent(username)}`);
    } else {
      res.render('login', { 
        title: 'Login - Absensi PKL', 
        error: 'Username atau Password salah, atau akun belum didaftarkan oleh Admin!' 
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { title: 'Login - Absensi PKL', error: 'Terjadi kesalahan pada server.' });
  }
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

// Proses Kirim Absen
app.post('/absen', async (req, res) => {
  const { username, status, koordinat } = req.body;

  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO absensi (username, status, koordinat) VALUES ($1, $2, $3)',
      [username, status, koordinat]
    );
    client.release();

    res.redirect(`/?user=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error('Error saat menyimpan absen:', err);
    res.status(500).send(`<h1>Gagal Menyimpan Absen:</h1><pre>${err.message}</pre>`);
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;