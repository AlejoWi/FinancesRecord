import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runWipeIfNeeded, resetWipeMarker } from '../src/api/wipe.js';

describe('local-data-wipe', () => {
  beforeEach(() => {
    localStorage.clear();
    resetWipeMarker();
  });

  it('removes legacy users + expenses keys and sets the marker', () => {
    localStorage.setItem('fr.users', '[{"id":"a","email":"a@x.com"}]');
    localStorage.setItem('fr.expenses', '[{"id":"b","amount":10}]');
    const result = runWipeIfNeeded();
    expect(result.hadUsers).toBe(true);
    expect(result.hadExpenses).toBe(true);
    expect(localStorage.getItem('fr.users')).toBeNull();
    expect(localStorage.getItem('fr.expenses')).toBeNull();
    expect(localStorage.getItem('fr.wiped')).toBe('1');
  });

  it('dispatches the fr:wiped CustomEvent on every wipe (even with no legacy data)', () => {
    const handler = vi.fn();
    window.addEventListener('fr:wiped', handler);
    const result = runWipeIfNeeded();
    expect(result.hadUsers).toBe(false);
    expect(result.hadExpenses).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('fr:wiped', handler);
  });

  it('is a no-op once the marker is set (subsequent logins)', () => {
    const handler = vi.fn();
    window.addEventListener('fr:wiped', handler);
    runWipeIfNeeded(); // first call: marker set
    runWipeIfNeeded(); // second call: skipped
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('fr:wiped', handler);
  });
});
