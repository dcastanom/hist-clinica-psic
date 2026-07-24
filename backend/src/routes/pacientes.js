const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = Router();
const prisma = new PrismaClient();

// All patient routes require authentication and tenant context
router.use(auth, tenantMiddleware);

// GET /api/pacientes
router.get('/', async (req, res) => {
  const { q, activo, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    tenantId: req.tenant.id,
    ...(activo !== undefined && { activo: activo === 'true' }),
    ...(q && {
      OR: [
        { nombre: { contains: q } },
        { apellido: { contains: q } },
        { dni: { contains: q } },
        { email: { contains: q } },
      ],
    }),
  };

  const [pacientes, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      skip,
      take: Number(limit),
    }),
    prisma.paciente.count({ where }),
  ]);

  return res.json({ data: pacientes, total, page: Number(page), limit: Number(limit) });
});

// GET /api/pacientes/:id
router.get('/:id', param('id').notEmpty(), async (req, res) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: {
      sesiones: {
        orderBy: { fecha: 'desc' },
        take: 10,
        include: { usuario: { select: { id: true, nombre: true, apellido: true } } },
      },
    },
  });
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
  return res.json(paciente);
});

// POST /api/pacientes
router.post(
  '/',
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('apellido').trim().notEmpty().withMessage('Apellido requerido'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('fechaNacimiento').optional({ checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { nombre, apellido, fechaNacimiento, dni, email, telefono, direccion, motivoConsulta } = req.body;

    const paciente = await prisma.paciente.create({
      data: {
        tenantId: req.tenant.id,
        nombre,
        apellido,
        ...(fechaNacimiento && { fechaNacimiento: new Date(fechaNacimiento) }),
        dni,
        email,
        telefono,
        direccion,
        motivoConsulta,
      },
    });

    return res.status(201).json(paciente);
  }
);

// PATCH /api/pacientes/:id
router.patch(
  '/:id',
  [
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('fechaNacimiento').optional({ checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const existing = await prisma.paciente.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Paciente no encontrado' });

    const { nombre, apellido, fechaNacimiento, dni, email, telefono, direccion, motivoConsulta, activo } = req.body;

    const updated = await prisma.paciente.update({
      where: { id: req.params.id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(apellido !== undefined && { apellido }),
        ...(fechaNacimiento !== undefined && { fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null }),
        ...(dni !== undefined && { dni }),
        ...(email !== undefined && { email }),
        ...(telefono !== undefined && { telefono }),
        ...(direccion !== undefined && { direccion }),
        ...(motivoConsulta !== undefined && { motivoConsulta }),
        ...(activo !== undefined && { activo }),
      },
    });

    return res.json(updated);
  }
);

// DELETE /api/pacientes/:id  – Soft delete (sets activo=false)
router.delete('/:id', async (req, res) => {
  const existing = await prisma.paciente.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Paciente no encontrado' });

  await prisma.paciente.update({
    where: { id: req.params.id },
    data: { activo: false },
  });

  return res.status(204).send();
});

module.exports = router;
