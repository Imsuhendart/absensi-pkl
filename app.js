const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware Setup
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'absensi_pkl_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Setup Multer untuk Upload Foto
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, 'foto-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware Cek Autentikasi Login
const requireLogin = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/login');
};

// --- RUTE AUTENTIKASI ---
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login - Absensi PKL', error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Akun Default Cepat (Jika Belum Terdaftar)
    if (username === 'admin' && password === 'admin123') {
        req.session.user = { username: 'admin', role: 'Pembimbing' };
        return res.redirect('/');
    }
    if (username === 'siswa' && password === 'siswa123') {
        req.session.user = { username: 'siswa', role: 'Siswa' };
        return res.redirect('/');
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = { username: user.username, role: user.role };
            res.redirect('/');
        } else {
            res.render('login', { title: 'Login - Absensi PKL', error: 'Username atau Password salah!' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- RUTE UTAMA (DILINDUNGI LOGIN) ---
app.get('/', requireLogin, (req, res) => {
    db.all('SELECT * FROM absensi ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).send('Terjadi kesalahan database.');
        res.render('index', { 
            title: 'Sistem Absensi PKL', 
            dataAbsensi: rows,
            user: req.session.user
        });
    });
});

app.post('/absen', requireLogin, upload.single('foto'), (req, res) => {
    const { nama, status, kegiatan, lokasi } = req.body;
    const foto = req.file ? req.file.filename : null;
    
    db.run('INSERT INTO absensi (nama, status, kegiatan, foto, lokasi) VALUES (?, ?, ?, ?, ?)', 
        [nama, status, kegiatan, foto, lokasi], (err) => {
            if (err) return res.status(500).send('Gagal menyimpan data.');
            res.redirect('/');
    });
});

app.post('/hapus/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.get('SELECT foto FROM absensi WHERE id = ?', [id], (err, row) => {
        if (row && row.foto) {
            const pathFoto = path.join(__dirname, 'public/uploads', row.foto);
            if (fs.existsSync(pathFoto)) fs.unlinkSync(pathFoto);
        }
        db.run('DELETE FROM absensi WHERE id = ?', [id], () => res.redirect('/'));
    });
});

app.get('/export', requireLogin, (req, res) => {
    db.all('SELECT * FROM absensi ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).send('Gagal mengambil data.');
        try {
            const parser = new Parser({ fields: ['id', 'waktu', 'nama', 'status', 'kegiatan', 'lokasi'] });
            const csv = parser.parse(rows);
            res.header('Content-Type', 'text/csv');
            res.attachment('laporan-absensi-pkl.csv');
            return res.send(csv);
        } catch (e) {
            res.status(500).send('Gagal mengekspor file.');
        }
    });
});

app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));