// Session management. We sign NOTHING in the cookie — the cookie value
// is a high-entropy random token (base64url). The server stores only
// the SHA-256 hash of the token in the DB. A DB compromise does not
// leak valid session tokens.
//
// Cookie name: fr_session
// Cookie flags (per R-AUTH-09): HttpOnly always; SameSite=Lax always;
// Secure ONLY when NODE_ENV=production.
//
// TTL: 7 days, sliding. Each authenticated request extends expires_at.

import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';

export const COOKIE_NAME = 'fr_session';
export const SESSION_TTL_DAYS = 7;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function newToken() {
  // 32 bytes -> 43 chars base64url (no padding). ~256 bits of entropy.
  return randomBytes(32).toString('base64url');
}

// Insert a new session for a user. Returns the raw token (which will
// be set in the cookie) and the inserted row (with id and expires_at).
export async function createSession(pg, userId) {
  const token = newToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const { rows } = await pg.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, created_at, expires_at`,
    [userId, tokenHash, expiresAt],
  );
  return { token, session: rows[0] };
}

// Look up a session by the raw token from the cookie. Returns the row
// (with user_id) if valid, null otherwise. Sliding expiration: extends
// expires_at if the session is used within the last day of its life.
export async function findValidSession(pg, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = sha256(rawToken);
  const { rows } = await pg.query(
    `SELECT id, user_id, created_at, expires_at
       FROM sessions
      WHERE token_hash = $1
        AND expires_at > NOW()`,
    [tokenHash],
  );
  if (rows.length === 0) return null;
  const session = rows[0];
  // Sliding expiration: if less than 1 day remains, extend by full TTL.
  const msLeft = new Date(session.expires_at).getTime() - Date.now();
  if (msLeft < 24 * 60 * 60 * 1000) {
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
    await pg.query(`UPDATE sessions SET expires_at = $1 WHERE id = $2`, [newExpiry, session.id]);
    session.expires_at = newExpiry.toISOString();
  }
  return session;
}

export async function deleteSession(pg, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return false;
  const tokenHash = sha256(rawToken);
  const { rowCount } = await pg.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
  return rowCount > 0;
}

// Build the Set-Cookie header value for a fresh session. Secure flag
// is gated on NODE_ENV=production per the spec.
export function buildSessionCookie(rawToken) {
  const parts = [
    `${COOKIE_NAME}=${rawToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (config.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookie() {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (config.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}
