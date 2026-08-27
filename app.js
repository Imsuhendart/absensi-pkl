const express = require('express');
const path = require('path');
const app = express();

// Middleware parsing body & static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set View Engine (EJS) dan path folder views
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- ROUTE APLIKASI ---

// Route Utama (Index)
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Absensi PKL',
    user: req.user || { username: 'Imam', role: 'Siswa' }, // Mencegah error 'user is not defined'
    data: [] // Mencegah error jika EJS butuh data tabel/list
  });
});

// Route Login
app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login Absensi PKL',
    error: null 
  });
});

// Handling Error (Menampilkan detail error jika ada crash)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`<h1>Detail Error Server:</h1><pre>${err.stack}</pre>`);
});

// Port & Export untuk Vercel
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;