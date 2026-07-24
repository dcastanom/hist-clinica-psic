require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const pacientesRoutes = require('./routes/pacientes');
const sesionesRoutes = require('./routes/sesiones');
const notasRoutes = require('./routes/notas');
const usuariosRoutes = require('./routes/usuarios');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/sesiones', sesionesRoutes);
app.use('/api/notas', notasRoutes);
app.use('/api/usuarios', usuariosRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
