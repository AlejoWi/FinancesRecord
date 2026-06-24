import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

// Single shared pool for the process. The pool is created at import time so
// `npm run migrate` (which imports this module directly) gets the same
// configuration as the running server.
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Fastify plugin: expose the pool on `app.pg` and close it on app close.
export async function dbPlugin(app) {
  app.decorate('pg', pool);
  app.addHook('onClose', async () => {
    await pool.end();
  });
}
