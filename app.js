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

// Inisialisasi Database
async function initDB() {
  try {
    const client = await pool.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS absensi (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        koordinat TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nama_lengkap TEXT NOT NULL,
        kelas TEXT NOT NULL,
        jurusan TEXT NOT NULL,
        foto TEXT
      )
    `);

    // Tambah kolom foto jika tabel sudah terlanjur dibuat tanpa kolom foto
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS foto TEXT`);

    const checkUser = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(checkUser.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO users (username, password, nama_lengkap, kelas, jurusan, foto) 
        VALUES ('ahmadfauzi', '123456', 'Ahmad Fauzi', 'XI TKJT 1', 'Teknik Komputer & Jaringan', 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
      `);
    }

    client.release();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}
initDB();

// Halaman Dashboard Siswa
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

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    return res.redirect('/admin?auth=true');
  }

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
        error: 'Username atau Password salah!' 
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { title: 'Login - Absensi PKL', error: 'Terjadi kesalahan pada server.' });
  }
});

// ==================== PANEL ADMIN ====================
app.get('/admin', async (req, res) => {
  if (req.query.auth !== 'true') {
    return res.redirect('/login');
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users ORDER BY id DESC');
    const usersList = result.rows;
    client.release();

    res.render('admin', { usersList, success: null });
  } catch (err) {
    console.error('Admin panel error:', err);
    res.status(500).send('Gagal membuka panel admin');
  }
});

// Proses Tambah Siswa oleh Admin (Termasuk Foto)
app.post('/admin/tambah-siswa', async (req, res) => {
  const { username, password, nama_lengkap, kelas, jurusan, foto } = req.body;
  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO users (username, password, nama_lengkap, kelas, jurusan, foto) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, password, nama_lengkap, kelas, jurusan, foto || null]
    );
    const result = await client.query('SELECT * FROM users ORDER BY id DESC');
    const usersList = result.rows;
    client.release();

    res.render('admin', { usersList, success: 'Akun dan foto siswa berhasil ditambahkan!' });
  } catch (err) {
    console.error('Tambah siswa error:', err);
    res.status(500).send(`Gagal menambahkan siswa: ${err.message}`);
  }
});

// Proses Hapus Siswa oleh Admin
app.post('/admin/hapus-siswa', async (req, res) => {
  const { id } = req.body;
  try {
    const client = await pool.connect();
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    const result = await client.query('SELECT * FROM users ORDER BY id DESC');
    const usersList = result.rows;
    client.release();

    res.render('admin', { usersList, success: 'Akun siswa berhasil dihapus!' });
  } catch (err) {
    console.error('Hapus siswa error:', err);
    res.status(500).send('Gagal menghapus siswa');
  }
});

app.get('/admin/logout', (req, res) => {
  res.redirect('/login');
});
// ============================================================

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