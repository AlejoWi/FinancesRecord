import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

// Per-app pool factory. Each call returns a NEW pg.Pool so a Fastify
// `onClose` hook can safely `pool.end()` it without colliding with
// another app (or a parallel `npm run migrate` invocation).
//
// `npm run migrate` (src/migrate.js) calls this factory directly, so it
// gets the same connection settings as the running server without
// sharing a pool.
export function createPool() {
  return new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

// Fastify plugin: attach a fresh pool to the app as `app.pg` and
// guarantee it is ended when the app closes.
export async function dbPlugin(app) {
  const pool = createPool();
  app.decorate('pg', pool);
  app.addHook('onClose', async () => {
    await pool.end();
  });
}
