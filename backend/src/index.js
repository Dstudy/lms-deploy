require('dotenv').config();
const express = require('express');
const cors = require('cors');

const path = require('path');
const authRoutes     = require('./routes/auth');
const superAuthRoutes = require('./routes/superauth');
const usersRoutes    = require('./routes/users');
const progressRoutes = require('./routes/progress');
const lessonsRoutes  = require('./routes/lessons');
const appsRoutes     = require('./routes/apps');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',      authRoutes);
app.use('/api/superauth', superAuthRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/progress',  progressRoutes);
app.use('/api/lessons',   lessonsRoutes);
app.use('/api/apps',      appsRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LMS backend running on port ${PORT}`);
});
