/**
 * Tenant isolation middleware.
 * Reads X-Tenant-Slug header and attaches the tenant to the request.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tenantMiddleware = async (req, res, next) => {
  const slug = req.headers['x-tenant-slug'];
  if (!slug) {
    return res.status(400).json({ error: 'Cabecera X-Tenant-Slug requerida' });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant no encontrado' });
  }

  // After JWT auth the tenantId in the token must match the header
  if (req.usuario && req.usuario.tenantId !== tenant.id) {
    return res.status(403).json({ error: 'Acceso no autorizado para este tenant' });
  }

  req.tenant = tenant;
  next();
};

module.exports = { tenantMiddleware, prisma };
