require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const pacientesRoutes = require('./routes/pacientes');
const sesionesRoutes = require('./routes/sesiones');
const notasRoutes = require('./routes/notas');
const usuariosRoutes = require('./routes/usuarios');

const app = express();

app.use(cors());
app.use(express.json());

// Strict rate limit for auth endpoints (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// General rate limit for all other API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Health check (no rate limit)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pacientes', apiLimiter, pacientesRoutes);
app.use('/api/sesiones', apiLimiter, sesionesRoutes);
app.use('/api/notas', apiLimiter, notasRoutes);
app.use('/api/usuarios', apiLimiter, usuariosRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
