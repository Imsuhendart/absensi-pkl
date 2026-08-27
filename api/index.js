const express = require('express');
const path = require('path');
const app = express();

// Set lokasi views menggunakan path absolute proyek
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Import app utama Anda
const mainApp = require('../app');
app.use('/', mainApp);

module.exports = app;