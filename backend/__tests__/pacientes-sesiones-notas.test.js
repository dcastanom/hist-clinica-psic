/**
 * Integration tests for patients, sessions, and clinical notes.
 * Reuses the same test DB as auth.test.js (must run after auth tests create the tenant).
 */
process.env.DATABASE_URL = 'file:/tmp/test-pacientes.db';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { execSync } = require('child_process');
const path = require('path');

beforeAll(() => {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe',
  });
});

const app = require('../src/app');

let token;
let tenantSlug = 'clinica-prueba';
let pacienteId;
let sesionId;

// ─── Setup: register tenant + login ──────────────────────────────────────────

beforeAll(async () => {
  await request(app).post('/api/auth/register-tenant').send({
    tenantNombre: 'Clínica Prueba',
    tenantSlug,
    email: 'psi@prueba.com',
    password: 'password123',
    nombre: 'Psicólogo',
    apellido: 'Prueba',
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    tenantSlug,
    email: 'psi@prueba.com',
    password: 'password123',
  });
  token = loginRes.body.token;
});

const authHeaders = () => ({
  Authorization: 'Bearer ' + token,
  'X-Tenant-Slug': tenantSlug,
});

// ─── Pacientes ────────────────────────────────────────────────────────────────

describe('Pacientes CRUD', () => {
  it('crea un paciente', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set(authHeaders())
      .send({ nombre: 'Juan', apellido: 'Pérez', dni: '12345678', email: 'juan@mail.com' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Juan');
    pacienteId = res.body.id;
  });

  it('lista pacientes', async () => {
    const res = await request(app).get('/api/pacientes').set(authHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('obtiene un paciente por id', async () => {
    const res = await request(app).get(`/api/pacientes/${pacienteId}`).set(authHeaders());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pacienteId);
  });

  it('actualiza un paciente', async () => {
    const res = await request(app)
      .patch(`/api/pacientes/${pacienteId}`)
      .set(authHeaders())
      .send({ telefono: '1122334455' });
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe('1122334455');
  });

  it('devuelve 404 para paciente de otro tenant', async () => {
    const res = await request(app).get('/api/pacientes/id-falso').set(authHeaders());
    expect(res.status).toBe(404);
  });

  it('requiere autenticación', async () => {
    const res = await request(app).get('/api/pacientes');
    expect(res.status).toBe(401);
  });
});

// ─── Sesiones ─────────────────────────────────────────────────────────────────

describe('Sesiones CRUD', () => {
  it('crea una sesión', async () => {
    const res = await request(app)
      .post('/api/sesiones')
      .set(authHeaders())
      .send({ pacienteId, fecha: new Date().toISOString(), modalidad: 'PRESENCIAL' });

    expect(res.status).toBe(201);
    expect(res.body.pacienteId).toBe(pacienteId);
    sesionId = res.body.id;
  });

  it('lista sesiones', async () => {
    const res = await request(app).get('/api/sesiones').set(authHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('cambia estado de sesión', async () => {
    const res = await request(app)
      .patch(`/api/sesiones/${sesionId}`)
      .set(authHeaders())
      .send({ estado: 'REALIZADA' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('REALIZADA');
  });
});

// ─── Notas Clínicas ───────────────────────────────────────────────────────────

describe('Notas Clínicas CRUD', () => {
  let notaId;

  it('crea una nota clínica', async () => {
    const res = await request(app)
      .post('/api/notas')
      .set(authHeaders())
      .send({ sesionId, contenido: 'Paciente refiere ansiedad generalizada.', etiquetas: 'ansiedad,seguimiento' });

    expect(res.status).toBe(201);
    expect(res.body.contenido).toContain('ansiedad');
    notaId = res.body.id;
  });

  it('lista notas de una sesión', async () => {
    const res = await request(app).get(`/api/notas?sesionId=${sesionId}`).set(authHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('actualiza una nota', async () => {
    const res = await request(app)
      .patch(`/api/notas/${notaId}`)
      .set(authHeaders())
      .send({ contenido: 'Contenido actualizado.' });
    expect(res.status).toBe(200);
    expect(res.body.contenido).toBe('Contenido actualizado.');
  });

  it('elimina una nota', async () => {
    const res = await request(app).delete(`/api/notas/${notaId}`).set(authHeaders());
    expect(res.status).toBe(204);
  });
});

// ─── Soft delete paciente ─────────────────────────────────────────────────────

describe('Soft delete paciente', () => {
  it('desactiva un paciente', async () => {
    const res = await request(app).delete(`/api/pacientes/${pacienteId}`).set(authHeaders());
    expect(res.status).toBe(204);
  });
});
