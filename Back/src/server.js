import Fastify from 'fastify';
import { config } from './config.js';
import { dbPlugin } from './plugins/db.js';
import { healthRoutes } from './plugins/health.js';

// Build (but do not start) a Fastify instance. Exported so tests can call
// `buildApp()` and use `app.inject()` to drive routes without binding a port.
//
// Plugin registration order (locked by design §2):
//   1. env      — config.js is imported above, validates on first load
//   2. db       — pg.Pool attached as `app.pg`
//   3. health   — public /healthz and /readyz
//   4. errors   — minimal handler in PR 2; full envelope (R-API-05) lands in PR 3
//   5. routes   — auth (PR 3), expenses/categories/dashboard (PR 4) plug in here
export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'production'
        ? { level: 'info' }
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            },
          },
    bodyLimit: 64 * 1024,
  });

  // Minimal error handler for PR 2. PR 3 replaces this with the spec'd
  // envelope { error, message, requestId } and zod issue mapping.
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'request error');
    reply
      .code(500)
      .send({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  await app.register(dbPlugin);
  await app.register(healthRoutes);

  return app;
}

// Entry point. `import.meta.vitest` is set by vitest's module loader, so this
// block is skipped when the file is imported from a test.
if (!import.meta.vitest) {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
