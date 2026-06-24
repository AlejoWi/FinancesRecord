import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/buildApp.js';

const TEST_DB = process.env.DATABASE_URL;
const skip = !TEST_DB || TEST_DB.includes('127.0.0.1:1');

async function bootstrapUser(app) {
  const email = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Cat Tester', email, password: 'strong-pass-1' },
  });
  const cookie = res.headers['set-cookie'].split(';')[0];
  return { user: res.json().user, cookie };
}

describe.skipIf(skip)('categories routes (integration)', () => {
  let app;
  let cookie;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const u = await bootstrapUser(app);
    cookie = u.cookie;
  });

  afterAll(async () => { if (app) await app.close(); });

  it('GET /api/categories without cookie returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/categories' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/categories with cookie returns the 4 seeded categories', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/categories',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const cats = res.json().categories;
    expect(cats).toHaveLength(4);
    expect(cats.map((c) => c.name)).toEqual(['Vivienda', 'Ocio', 'Transporte', 'Alimentación']);
  });
});