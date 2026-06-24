/**
 * Password hashing using SHA-256 + per-user salt via Web Crypto API.
 *
 * SECURITY NOTE: SHA-256 + salt (as specified in the requirements) is much
 * weaker than bcrypt/argon2 because it is not adaptive/slow. This is what the
 * spec asks for; do NOT use this scheme for a real production system.
 */

const enc = new TextEncoder();

function bytesToHex(buf) {
  const arr = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function generateSalt(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes.buffer);
}

export async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return bytesToHex(digest);
}

/**
 * Returns a string formatted as `sha256$<saltHex>$<hashHex>` so we can
 * later verify without storing the salt separately.
 */
export async function hashPassword(password, salt = generateSalt()) {
  const hash = await sha256Hex(`${salt}:${password}`);
  return `sha256$${salt}$${hash}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'sha256') return false;
  const [, salt, expected] = parts;
  const actual = await sha256Hex(`${salt}:${password}`);
  return actual === expected;
}
