import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/buildApp.js';

const TEST_DB = process.env.DATABASE_URL;
const skip = !TEST_DB || TEST_DB.includes('127.0.0.1:1');

async function makeUser(app, label = 'exp') {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: label, email, password: 'strong-pass-1' },
  });
  return { user: res.json().user, cookie: res.headers['set-cookie'].split(';')[0] };
}

describe.skipIf(skip)('expenses routes (integration)', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => { if (app) await app.close(); });

  beforeEach(async () => {
    // Clean slate (sessions first because of FK).
    await app.pg.query('TRUNCATE TABLE expenses');
    await app.pg.query('TRUNCATE TABLE sessions');
    await app.pg.query('TRUNCATE TABLE users CASCADE');
  });

  it('POST /api/expenses creates an expense and returns 201', async () => {
    const { cookie } = await makeUser(app, 'creator');
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 123.45, description: 'rent', expenseDate: '2026-06-01' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().expense).toMatchObject({ categoryId: 1, amount: 123.45 });
  });

  it('GET /api/expenses only returns the caller\'s expenses (list-isolation)', async () => {
    const a = await makeUser(app, 'alice');
    const b = await makeUser(app, 'bob');
    // Alice creates 1
    await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie: a.cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 50, expenseDate: '2026-06-01' },
    });
    // Bob creates 2
    await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie: b.cookie, 'content-type': 'application/json' },
      payload: { categoryId: 2, amount: 30, expenseDate: '2026-06-02' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie: b.cookie, 'content-type': 'application/json' },
      payload: { categoryId: 3, amount: 20, expenseDate: '2026-06-03' },
    });
    // Alice sees only hers
    const aRes = await app.inject({ method: 'GET', url: '/api/expenses', headers: { cookie: a.cookie } });
    expect(aRes.json().expenses).toHaveLength(1);
    // Bob sees both
    const bRes = await app.inject({ method: 'GET', url: '/api/expenses', headers: { cookie: b.cookie } });
    expect(bRes.json().expenses).toHaveLength(2);
  });

  it('GET /api/expenses/:id returns 404 for cross-user access (NOT 403)', async () => {
    const a = await makeUser(app, 'alice');
    const b = await makeUser(app, 'bob');
    const create = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie: a.cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 99, expenseDate: '2026-06-01' },
    });
    const id = create.json().expense.id;
    // Bob tries to read Alice's expense
    const res = await app.inject({
      method: 'GET', url: `/api/expenses/${id}`, headers: { cookie: b.cookie },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('NOT_FOUND');
  });

  it('PATCH /api/expenses/:id returns 404 for cross-user update', async () => {
    const a = await makeUser(app, 'alice');
    const b = await makeUser(app, 'bob');
    const create = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie: a.cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 99, expenseDate: '2026-06-01' },
    });
    const id = create.json().expense.id;
    const res = await app.inject({
      method: 'PATCH', url: `/api/expenses/${id}`,
      headers: { cookie: b.cookie, 'content-type': 'application/json' },
      payload: { amount: 1 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/expenses/:id returns 404 for cross-user delete', async () => {
    const a = await makeUser(app, 'alice');
    const b = await makeUser(app, 'bob');
    const create = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie: a.cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 99, expenseDate: '2026-06-01' },
    });
    const id = create.json().expense.id;
    const res = await app.inject({
      method: 'DELETE', url: `/api/expenses/${id}`, headers: { cookie: b.cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/expenses with amount=0 returns 400 VALIDATION_FAILED', async () => {
    const { cookie } = await makeUser(app, 'zero');
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 0, expenseDate: '2026-06-01' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('VALIDATION_FAILED');
  });

  it('POST /api/expenses with unknown categoryId returns 400 UNKNOWN_CATEGORY', async () => {
    const { cookie } = await makeUser(app, 'badcat');
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { categoryId: 999, amount: 10, expenseDate: '2026-06-01' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('UNKNOWN_CATEGORY');
  });

  it('POST /api/expenses coerces amount to 2 decimals (e.g. 1.235 -> 1.24)', async () => {
    const { cookie } = await makeUser(app, 'rounder');
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie, 'content-type': 'application/json' },
      payload: { categoryId: 1, amount: 1.235, expenseDate: '2026-06-01' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().expense.amount).toBe(1.24);
  });
});