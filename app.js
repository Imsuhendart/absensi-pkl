const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set View Engine
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- ROUTE APLIKASI ---

// Route Utama (Membaca status login dari URL query ?user=Nama)
app.get('/', (req, res) => {
  const username = req.query.user || null;
  const user = username ? { username: username, role: 'Siswa' } : null;

  res.render('index', { 
    title: 'Absensi PKL',
    user: user,
    data: [] 
  });
});

// Route Halaman Form Login
app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login Absensi PKL',
    error: null 
  });
});

// Proses Submit Form Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    // Redirect ke halaman utama membawa nama user
    res.redirect(`/?user=${encodeURIComponent(username)}`);
  } else {
    res.render('login', { title: 'Login Absensi PKL', error: 'Username dan Password wajib diisi!' });
  }
});

// Route Logout
app.get('/logout', (req, res) => {
  res.redirect('/');
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