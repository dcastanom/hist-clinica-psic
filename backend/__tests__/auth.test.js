/**
 * Integration tests for the auth routes.
 * Uses an in-memory SQLite database via a test environment variable.
 */
process.env.DATABASE_URL = 'file:/tmp/test-auth.db';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { execSync } = require('child_process');
const path = require('path');

// Push the schema to the test DB before any tests run
beforeAll(() => {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
    stdio: 'pipe',
  });
});

const app = require('../src/app');

describe('POST /api/auth/register-tenant', () => {
  const payload = {
    tenantNombre: 'Consultorio Test',
    tenantSlug: 'consultorio-test',
    email: 'admin@test.com',
    password: 'password123',
    nombre: 'Admin',
    apellido: 'Test',
  };

  it('crea un nuevo tenant y devuelve token', async () => {
    const res = await request(app).post('/api/auth/register-tenant').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.tenant.slug).toBe('consultorio-test');
    expect(res.body.usuario.rol).toBe('ADMIN');
  });

  it('rechaza slug duplicado', async () => {
    const res = await request(app).post('/api/auth/register-tenant').send(payload);
    expect(res.status).toBe(409);
  });

  it('rechaza datos inválidos', async () => {
    const res = await request(app).post('/api/auth/register-tenant').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

describe('POST /api/auth/login', () => {
  it('autentifica con credenciales correctas', async () => {
    const res = await request(app).post('/api/auth/login').send({
      tenantSlug: 'consultorio-test',
      email: 'admin@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rechaza contraseña incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({
      tenantSlug: 'consultorio-test',
      email: 'admin@test.com',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
  });

  it('rechaza tenant inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({
      tenantSlug: 'no-existe',
      email: 'admin@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      tenantSlug: 'consultorio-test',
      email: 'admin@test.com',
      password: 'password123',
    });
    token = res.body.token;
  });

  it('devuelve el usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
  });

  it('rechaza sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
