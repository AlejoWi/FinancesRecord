import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/buildApp.js';

const TEST_DB = process.env.DATABASE_URL;
const skip = !TEST_DB || TEST_DB.includes('127.0.0.1:1');

async function makeUser(app, label = 'dash') {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: label, email, password: 'strong-pass-1' },
  });
  return { user: res.json().user, cookie: res.headers['set-cookie'].split(';')[0] };
}

async function addExpense(app, cookie, payload) {
  return app.inject({
    method: 'POST',
    url: '/api/expenses',
    headers: { cookie, 'content-type': 'application/json' },
    payload,
  });
}

describe.skipIf(skip)('dashboard routes (integration)', () => {
  let app;
  let cookie;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const u = await makeUser(app, 'dash');
    cookie = u.cookie;
    // Seed 3 expenses across 2 categories in the current month
    const today = new Date();
    const monthStart = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-01`;
    await addExpense(app, cookie, { categoryId: 1, amount: 100, expenseDate: monthStart });
    await addExpense(app, cookie, { categoryId: 1, amount: 50,  expenseDate: monthStart });
    await addExpense(app, cookie, { categoryId: 2, amount: 25,  expenseDate: monthStart });
  });

  afterAll(async () => { if (app) await app.close(); });

  beforeEach(async () => {
    // Don't truncate between tests because we want the seeded data to persist
  });

  it('GET /api/dashboard?period=current_month returns total + byCategory', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/dashboard?period=current_month', headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.period).toBe('current_month');
    expect(body.total).toBe(175);
    // byCategory should be ordered DESC: cat 1 (150) > cat 2 (25)
    expect(body.byCategory[0]).toMatchObject({ categoryId: 1, total: 150 });
    expect(body.byCategory[1]).toMatchObject({ categoryId: 2, total: 25 });
  });

  it('GET /api/dashboard without auth returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/dashboard?period=year includes byMonth', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/dashboard?period=year', headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.period).toBe('year');
    expect(Array.isArray(body.byMonth)).toBe(true);
  });
});