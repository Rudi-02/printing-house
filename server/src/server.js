require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// staticki fajlovi: profilne slike, slike proizvoda, otpremljeni motivi, PDF izvestaji
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', db: 'printing-house-db' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`)))
  .catch(err => { console.error('[db] greška pri povezivanju:', err.message); process.exit(1); });
