// Vitest setup. Loads @testing-library/jest-dom matchers and provides
// a clean localStorage between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* noop in non-DOM env */
  }
});
