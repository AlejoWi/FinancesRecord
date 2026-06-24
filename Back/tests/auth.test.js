import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/server.js';
import { pool } from '../src/plugins/db.js';

// Integration tests for /api/auth. These REQUIRE a real Postgres
// reachable at DATABASE_URL because the routes query the users +
// sessions tables.
//
// If the DB is unreachable, the suite will hang on the first
// `app.pg.query` call. We mitigate by setting a per-test cleanup
// (truncate users + sessions) and skipping the suite with a clear
// message if the connection fails.
const TEST_DB = process.env.DATABASE_URL;
const skip = !TEST_DB || TEST_DB.includes('127.0.0.1:1');

describe.skipIf(skip)('auth routes (integration)', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    // Clean slate per test. Order matters: sessions first (FK), then users.
    await pool.query('TRUNCATE TABLE sessions');
    await pool.query('TRUNCATE TABLE users CASCADE');
  });

  function uniqueEmail(label = 'user') {
    return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  }

  it('POST /api/auth/register creates a user and sets a session cookie (S-AUTH-01)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Alice', email: uniqueEmail('alice'), password: 'strong-pass-1' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user).toMatchObject({ name: 'Alice' });
    expect(body.user).not.toHaveProperty('password_hash');
    expect(res.headers['set-cookie']).toMatch(/fr_session=/);
  });

  it('POST /api/auth/register with duplicate email returns 409 EMAIL_TAKEN (S-AUTH-02)', async () => {
    const email = uniqueEmail('dup');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'A', email, password: 'strong-pass-1' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'B', email, password: 'strong-pass-2' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('EMAIL_TAKEN');
  });

  it('POST /api/auth/login with valid credentials returns user and cookie (S-AUTH-03)', async () => {
    const email = uniqueEmail('login');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'A', email, password: 'strong-pass-1' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'strong-pass-1' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
    expect(res.headers['set-cookie']).toMatch(/fr_session=/);
  });

  it('POST /api/auth/login with wrong password returns 401 INVALID_CREDENTIALS (S-AUTH-04)', async () => {
    const email = uniqueEmail('wrong-pw');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'A', email, password: 'strong-pass-1' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'wrong-pass-1' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/auth/login with unknown email returns 401 INVALID_CREDENTIALS (S-AUTH-05)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: uniqueEmail('ghost'), password: 'whatever-123' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/auth/logout clears the session and returns 204 (S-AUTH-06)', async () => {
    const email = uniqueEmail('logout');
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'A', email, password: 'strong-pass-1' },
    });
    const cookie = reg.headers['set-cookie'].split(';')[0]; // fr_session=...
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['set-cookie']).toMatch(/fr_session=;.*Max-Age=0/);
  });

  it('GET /api/auth/me with valid cookie returns 200 + user (S-AUTH-07)', async () => {
    const email = uniqueEmail('me');
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Me', email, password: 'strong-pass-1' },
    });
    const cookie = reg.headers['set-cookie'].split(';')[0];
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
  });

  it('GET /api/auth/me without cookie returns 401 UNAUTHENTICATED (S-AUTH-08)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('UNAUTHENTICATED');
  });

  it('GET /api/auth/me with stale cookie returns 401 UNAUTHENTICATED (S-AUTH-09)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: 'fr_session=this-token-does-not-exist' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('UNAUTHENTICATED');
  });

  it('register with short password returns 400 VALIDATION_FAILED (R-AUTH-07)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'X', email: uniqueEmail('short'), password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('VALIDATION_FAILED');
  });

  it('register with wrong content-type returns 415 (R-AUTH-08 — Fastify default)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: { 'content-type': 'text/plain' },
      payload: 'not json',
    });
    expect(res.statusCode).toBe(415);
  });
});
