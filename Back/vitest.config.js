import { defineConfig } from 'vitest/config';

// config.js calls `import 'dotenv/config'` and zod-validates
// DATABASE_URL at module load — if it's missing, config.js calls
// process.exit(1) and the test suite fails before any test runs.
//
// Set a sentinel fallback here so tests can run offline. The `??=` only
// assigns when DATABASE_URL is NOT already set, so a real value from
// the shell or a .env file wins.
process.env.DATABASE_URL ??= 'postgres://nobody:nobody@127.0.0.1:1/nobody';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // /readyz is exercised manually in PR 3 with a real test DB.
    testTimeout: 5000,
  },
});
