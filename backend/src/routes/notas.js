const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = Router();
const prisma = new PrismaClient();

router.use(auth, tenantMiddleware);

// GET /api/notas?sesionId=
router.get('/', async (req, res) => {
  const { sesionId, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    tenantId: req.tenant.id,
    ...(sesionId && { sesionId }),
  };

  const [notas, total] = await Promise.all([
    prisma.notaClinica.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
      include: {
        sesion: {
          select: {
            id: true,
            fecha: true,
            paciente: { select: { id: true, nombre: true, apellido: true } },
          },
        },
      },
    }),
    prisma.notaClinica.count({ where }),
  ]);

  return res.json({ data: notas, total, page: Number(page), limit: Number(limit) });
});

// GET /api/notas/:id
router.get('/:id', async (req, res) => {
  const nota = await prisma.notaClinica.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: {
      sesion: {
        include: {
          paciente: { select: { id: true, nombre: true, apellido: true } },
          usuario: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  });
  if (!nota) return res.status(404).json({ error: 'Nota clínica no encontrada' });
  return res.json(nota);
});

// POST /api/notas
router.post(
  '/',
  [
    body('sesionId').notEmpty().withMessage('sesionId requerido'),
    body('contenido').trim().notEmpty().withMessage('Contenido requerido'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { sesionId, contenido, etiquetas } = req.body;

    // Verify the session belongs to this tenant
    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId, tenantId: req.tenant.id },
    });
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    const nota = await prisma.notaClinica.create({
      data: {
        tenantId: req.tenant.id,
        sesionId,
        contenido,
        etiquetas: etiquetas || null,
      },
    });

    return res.status(201).json(nota);
  }
);

// PATCH /api/notas/:id
router.patch(
  '/:id',
  [body('contenido').optional().trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const existing = await prisma.notaClinica.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Nota clínica no encontrada' });

    const { contenido, etiquetas } = req.body;

    const updated = await prisma.notaClinica.update({
      where: { id: req.params.id },
      data: {
        ...(contenido !== undefined && { contenido }),
        ...(etiquetas !== undefined && { etiquetas }),
      },
    });

    return res.json(updated);
  }
);

// DELETE /api/notas/:id
router.delete('/:id', async (req, res) => {
  const existing = await prisma.notaClinica.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Nota clínica no encontrada' });

  await prisma.notaClinica.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

module.exports = router;
