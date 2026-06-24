import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { dbPlugin } from './plugins/db.js';
import { healthRoutes } from './plugins/health.js';
import { authRoutes } from './routes/auth.js';
import { categoryRoutes } from './routes/categories.js';
import { attachRequestId, registerErrorHandler } from './errors.js';

// Build (but do not start) a Fastify instance. Exported so tests can call
// `buildApp()` and use `app.inject()` to drive routes without binding a port.
//
// Plugin registration order (locked by design §2; PR 3 extends the PR 2 order):
//   1. request-id   — attachRequestId (onRequest hook sets req.requestId)
//   2. error-handler — registerErrorHandler (must be registered BEFORE routes)
//   3. env          — config.js is imported above, validates on first load
//   4. db           — pg.Pool attached as `app.pg` (per-app, see plugins/db.js)
//   5. cookie       — @fastify/cookie; provides req.cookies (no secret: tokens are DB-hashed, not signed)
//   6. health       — public /healthz and /readyz
//   7. routes       — auth (this PR); expenses/categories/dashboard (PR 4)
export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'production'
        ? { level: 'info' }
        : {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
            },
          },
    bodyLimit: 64 * 1024,
  });

  // Order matters: request-id FIRST so the error handler can read it.
  attachRequestId(app);
  registerErrorHandler(app);

  await app.register(dbPlugin);
  await app.register(cookie, {});
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(categoryRoutes);

  return app;
}
