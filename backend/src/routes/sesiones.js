const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = Router();
const prisma = new PrismaClient();

const MODALIDADES = ['PRESENCIAL', 'VIRTUAL'];
const ESTADOS = ['PROGRAMADA', 'REALIZADA', 'CANCELADA', 'NO_ASISTIO'];

router.use(auth, tenantMiddleware);

// GET /api/sesiones?pacienteId=&usuarioId=&estado=&desde=&hasta=
router.get('/', async (req, res) => {
  const { pacienteId, usuarioId, estado, desde, hasta, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    tenantId: req.tenant.id,
    ...(pacienteId && { pacienteId }),
    ...(usuarioId && { usuarioId }),
    ...(estado && { estado }),
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(hasta) }),
          },
        }
      : {}),
  };

  const [sesiones, total] = await Promise.all([
    prisma.sesion.findMany({
      where,
      orderBy: { fecha: 'desc' },
      skip,
      take: Number(limit),
      include: {
        paciente: { select: { id: true, nombre: true, apellido: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    }),
    prisma.sesion.count({ where }),
  ]);

  return res.json({ data: sesiones, total, page: Number(page), limit: Number(limit) });
});

// GET /api/sesiones/:id
router.get('/:id', async (req, res) => {
  const sesion = await prisma.sesion.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: {
      paciente: { select: { id: true, nombre: true, apellido: true } },
      usuario: { select: { id: true, nombre: true, apellido: true } },
      notasClinicas: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });
  return res.json(sesion);
});

// POST /api/sesiones
router.post(
  '/',
  [
    body('pacienteId').notEmpty().withMessage('pacienteId requerido'),
    body('fecha').isISO8601().withMessage('Fecha inválida'),
    body('duracion').optional().isInt({ min: 1 }),
    body('modalidad').optional().isIn(MODALIDADES),
    body('estado').optional().isIn(ESTADOS),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { pacienteId, fecha, duracion, modalidad, estado, observacion } = req.body;

    // Verify patient belongs to tenant
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, tenantId: req.tenant.id },
    });
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

    const sesion = await prisma.sesion.create({
      data: {
        tenantId: req.tenant.id,
        pacienteId,
        usuarioId: req.usuario.id,
        fecha: new Date(fecha),
        duracion: duracion || 50,
        modalidad: modalidad || 'PRESENCIAL',
        estado: estado || 'PROGRAMADA',
        observacion,
      },
      include: {
        paciente: { select: { id: true, nombre: true, apellido: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    return res.status(201).json(sesion);
  }
);

// PATCH /api/sesiones/:id
router.patch(
  '/:id',
  [
    body('fecha').optional().isISO8601(),
    body('duracion').optional().isInt({ min: 1 }),
    body('modalidad').optional().isIn(MODALIDADES),
    body('estado').optional().isIn(ESTADOS),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const existing = await prisma.sesion.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Sesión no encontrada' });

    const { fecha, duracion, modalidad, estado, observacion } = req.body;

    const updated = await prisma.sesion.update({
      where: { id: req.params.id },
      data: {
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(duracion !== undefined && { duracion }),
        ...(modalidad !== undefined && { modalidad }),
        ...(estado !== undefined && { estado }),
        ...(observacion !== undefined && { observacion }),
      },
      include: {
        paciente: { select: { id: true, nombre: true, apellido: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    return res.json(updated);
  }
);

// DELETE /api/sesiones/:id
router.delete('/:id', async (req, res) => {
  const existing = await prisma.sesion.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Sesión no encontrada' });

  await prisma.sesion.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

module.exports = router;
