const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { auth, requireRol } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = Router();
const prisma = new PrismaClient();

router.use(auth, tenantMiddleware);

// GET /api/usuarios  – List users in the tenant (admin only)
router.get('/', requireRol('ADMIN'), async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    where: { tenantId: req.tenant.id },
    select: { id: true, email: true, nombre: true, apellido: true, rol: true, activo: true, createdAt: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
  return res.json(usuarios);
});

// POST /api/usuarios  – Create a new user within the tenant (admin only)
router.post(
  '/',
  requireRol('ADMIN'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('nombre').trim().notEmpty(),
    body('apellido').trim().notEmpty(),
    body('rol').optional().isIn(['ADMIN', 'PSICOLOGO']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password, nombre, apellido, rol } = req.body;

    const existing = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: req.tenant.id, email } },
    });
    if (existing) return res.status(409).json({ error: 'El email ya está registrado en este consultorio' });

    const passwordHash = await bcrypt.hash(password, 12);
    const usuario = await prisma.usuario.create({
      data: { tenantId: req.tenant.id, email, passwordHash, nombre, apellido, rol: rol || 'PSICOLOGO' },
      select: { id: true, email: true, nombre: true, apellido: true, rol: true, activo: true },
    });

    return res.status(201).json(usuario);
  }
);

// PATCH /api/usuarios/:id  – Update user (admin only, or self for password change)
router.patch('/:id', async (req, res) => {
  const targetId = req.params.id;
  const isSelf = req.usuario.id === targetId;
  const isAdmin = req.usuario.rol === 'ADMIN';

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const existing = await prisma.usuario.findFirst({
    where: { id: targetId, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { nombre, apellido, password, rol, activo } = req.body;

  const data = {
    ...(nombre !== undefined && { nombre }),
    ...(apellido !== undefined && { apellido }),
    ...(isAdmin && rol !== undefined && { rol }),
    ...(isAdmin && activo !== undefined && { activo }),
  };

  if (password) {
    if (password.length < 8) return res.status(422).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.usuario.update({
    where: { id: targetId },
    data,
    select: { id: true, email: true, nombre: true, apellido: true, rol: true, activo: true },
  });

  return res.json(updated);
});

module.exports = router;
