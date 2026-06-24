import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // We don't need a real DB for PR 2 tests. /readyz is exercised manually
    // in PR 3 with a test DB.
    testTimeout: 5000,
  },
});
