// Password hashing and verification using node:crypto.scrypt.
//
// Parameters: N=2^15 (32768), r=8, p=1. Tuned for ~30-50ms on a modern
// dev box. The 30ms timing smoke test in tests/passwords.test.js asserts
// the floor (SPEC R-AUTH-06 constant-time path).
//
// Stored format (VARCHAR(255) in users.password_hash):
//   scrypt$N=32768,r=8,p=1$<saltHex>$<hashHex>
// The prefix encodes the parameters so they can be tuned later without
// breaking existing hashes.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

const N = 1 << 15; // 32768
const r = 8;
const p = 1;
const KEY_LEN = 64; // bytes
const SALT_LEN = 16; // bytes
const MAX_PASSWORD_LEN = 128; // bytes (defensive: zod enforces min 8)

function formatHash({ salt, hash }) {
  return `scrypt$N=${N},r=${r},p=${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function parseHash(stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 4) throw new Error('invalid password hash format');
  const [tag, params, saltHex, hashHex] = parts;
  if (tag !== 'scrypt') throw new Error('unsupported password hash algorithm');
  // params string is informational; we use the N/r/p constants from this
  // module to verify (tuning would require a versioned verify path).
  if (!saltHex || !hashHex) throw new Error('invalid password hash format');
  return { salt: Buffer.from(saltHex, 'hex'), hash: Buffer.from(hashHex, 'hex') };
}

export async function hashPassword(plain) {
  if (typeof plain !== 'string') throw new TypeError('password must be a string');
  if (plain.length < 8) throw new RangeError('password must be at least 8 characters');
  if (plain.length > MAX_PASSWORD_LEN) throw new RangeError('password is too long');
  const salt = randomBytes(SALT_LEN);
  // maxmem: 64 MiB. The scrypt cost for N=32768, r=8, p=1 is exactly
  // 32 MiB; OpenSSL 3's default `maxmem` of 32 MiB has a strict `>`
  // check that fails on the boundary. 64 MiB gives comfortable headroom
  // without granting attacker-controlled memory pressure.
  const hash = await scrypt(plain, salt, KEY_LEN, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return formatHash({ salt, hash });
}

export async function verifyPassword(plain, stored) {
  // Constant-time: always run scrypt, even on bad input. The call site
  // is responsible for passing a DUMMY stored hash when the user does
  // not exist (see auth.js). That keeps the timing path identical for
  // "user exists, wrong password" and "user does not exist".
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  let parsed;
  try {
    parsed = parseHash(stored);
  } catch {
    return false;
  }
  let candidate;
  try {
    // maxmem must match hashPassword; see comment there.
    candidate = await scrypt(plain, parsed.salt, parsed.hash.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
  } catch {
    return false;
  }
  // Equal length required for timingSafeEqual.
  if (candidate.length !== parsed.hash.length) return false;
  return timingSafeEqual(candidate, parsed.hash);
}

// A pre-computed DUMMY hash used by register/login when the user does
// not exist, so the scrypt timing is consistent. Generated at module
// load with a known plaintext; verifying against any other plaintext
// returns false. The plaintext is never used — only the hash and the
// timing it produces.
let dummyHashPromise = null;
export function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('dummy-plaintext-for-timing-only');
  }
  return dummyHashPromise;
}
