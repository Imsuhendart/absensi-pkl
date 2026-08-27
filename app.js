const express = require('express');
const path = require('path');
const app = express();

// Middleware parsing body & static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set View Engine (EJS) dan tentukan path absolute ke folder views
// Tentukan lokasi folder views menggunakan path.resolve
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- ROUTE APLIKASI ---
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

// Jalankan server lokal (hanya aktif di komputer/lokal)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// WAJIB: Export app untuk Vercel Serverless
module.exports = app;