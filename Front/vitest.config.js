import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// config.js on the Back side calls process.exit(1) when DATABASE_URL is
// missing. The Front tests don't need a real DB, but if a test imports
// something that transitively loads Back's config, the test suite would
// crash. We don't import Back from Front tests; this comment is here
// so future contributors don't accidentally add a cross-side import.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
});
