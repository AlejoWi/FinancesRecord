import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from '../src/buildApp.js';

describe('health routes', () => {
  const apps = [];

  async function getApp() {
    const app = await buildApp();
    await app.ready();
    apps.push(app);
    return app;
  }

  afterAll(async () => {
    for (const app of apps) {
      await app.close();
    }
  });

  it('GET /healthz returns 200 with status ok (no DB call)', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
    expect(res.json()).toHaveProperty('uptimeSec');
  });

  it('GET /healthz never touches the DB', async () => {
    // We can't easily prove a negative, but if the DB was being touched the
    // app would hang on a missing DATABASE_URL. We set it to a sentinel value
    // that would fail the connection if pinged.
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://nobody:nobody@127.0.0.1:1/nobody';
    try {
      const app = await getApp();
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.statusCode).toBe(200);
    } finally {
      process.env.DATABASE_URL = prev;
    }
  });
});
