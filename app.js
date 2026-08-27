const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Konfigurasi koneksi database menggunakan environment variable dari Vercel / Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Diperlukan untuk koneksi aman ke Neon
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

// Halaman Utama (Ambil data dari Neon Postgres)
app.get('/', async (req, res) => {
  const username = req.query.user || null;
  const user = username ? { username: username, role: 'Siswa PKL' } : null;

  let absensiList = [];
  try {
    const client = await pool.connect();
    
    // Buat tabel otomatis jika belum ada
    await client.query(`
      CREATE TABLE IF NOT EXISTS absensi (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        koordinat TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ambil data riwayat absensi
    const result = await client.query('SELECT * FROM absensi ORDER BY created_at DESC');
    absensiList = result.rows;
    
    client.release();
  } catch (err) {
    console.error('Gagal mengambil data dari database:', err);
  }

  res.render('index', { 
    title: 'Aplikasi Absensi PKL',
    user: user,
    absensiList: absensiList 
  });
});

// Halaman Login
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - Absensi PKL', error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    res.redirect(`/?user=${encodeURIComponent(username)}`);
  } else {
    res.render('login', { title: 'Login - Absensi PKL', error: 'Username dan Password wajib diisi!' });
  }
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

// Proses Kirim Absen (Simpan ke Neon Postgres)
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

// Handling Error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`<h1>Detail Error Server:</h1><pre>${err.stack}</pre>`);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;