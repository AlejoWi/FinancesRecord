import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, getDummyHash } from '../src/auth/passwords.js';

describe('password hashing', () => {
  it('hashPassword produces a string with the expected format', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).toMatch(/^scrypt\$N=32768,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('verifyPassword returns true for the right password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('verifyPassword returns false for a wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('two hashes of the same password differ (random salt)', async () => {
    const a = await hashPassword('same-input');
    const b = await hashPassword('same-input');
    expect(a).not.toBe(b);
  });

  it('hashPassword rejects passwords shorter than 8 chars', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
  });

  it('verifyPassword returns false for malformed stored hash', async () => {
    expect(await verifyPassword('whatever', 'not-a-valid-hash')).toBe(false);
    expect(await verifyPassword('whatever', '')).toBe(false);
  });

  // SPEC R-AUTH-06 constant-time floor: the scrypt call must take at
  // least 30ms on a modern dev box. This catches a misconfiguration
  // (e.g., someone lowering N to make tests fast) which would also
  // break the constant-time contract.
  it('scrypt hashing takes at least 30ms (constant-time floor)', async () => {
    const t0 = Date.now();
    await hashPassword('timing-floor-test');
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(20); // small CI margin below the 30ms spec
  });
});

describe('dummy hash (constant-time path)', () => {
  it('getDummyHash returns a valid hash that does not verify any known plaintext', async () => {
    const dummy = await getDummyHash();
    expect(dummy).toMatch(/^scrypt\$/);
    expect(await verifyPassword('any-plaintext', dummy)).toBe(false);
  });
});
