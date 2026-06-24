// Process entry point. Builds the Fastify app and binds to PORT.
// Tests import `buildApp` from `./buildApp.js` instead, so this
// file is only loaded by `node src/server.js` (or the Dockerfile CMD).

import { config } from './config.js';
import { buildApp } from './buildApp.js';

const app = await buildApp();
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
