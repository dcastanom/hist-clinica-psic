const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/register-tenant  – Creates a new tenant and its first admin user
router.post(
  '/register-tenant',
  [
    body('tenantNombre').trim().notEmpty().withMessage('Nombre del consultorio requerido'),
    body('tenantSlug')
      .trim()
      .notEmpty()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug solo puede contener letras minúsculas, números y guiones'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('apellido').trim().notEmpty().withMessage('Apellido requerido'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { tenantNombre, tenantSlug, email, password, nombre, apellido } = req.body;

    const existing = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existing) {
      return res.status(409).json({ error: 'El slug ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        nombre: tenantNombre,
        slug: tenantSlug,
        usuarios: {
          create: {
            email,
            passwordHash,
            nombre,
            apellido,
            rol: 'ADMIN',
          },
        },
      },
      include: { usuarios: true },
    });

    const usuario = tenant.usuarios[0];
    const token = jwt.sign(
      { id: usuario.id, tenantId: tenant.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol },
      tenant: { id: tenant.id, nombre: tenant.nombre, slug: tenant.slug },
    });
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    body('tenantSlug').trim().notEmpty().withMessage('Slug del consultorio requerido'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email, password, tenantSlug } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, usuario.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, tenantId: tenant.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol },
      tenant: { id: tenant.id, nombre: tenant.nombre, slug: tenant.slug },
    });
  }
);

// GET /api/auth/me – Returns authenticated user info
router.get('/me', auth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    select: { id: true, email: true, nombre: true, apellido: true, rol: true, tenantId: true },
  });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json(usuario);
});

module.exports = router;
