// Auth middleware factory. Returns a Fastify preHandler that validates
// the session cookie and decorates the request with `userId` and
// `session`. Used by every protected route (categories, expenses,
// dashboard).
//
// Throws 401 UNAUTHENTICATED on missing or invalid cookie. The error
// envelope is handled by registerErrorHandler.

import { findValidSession, COOKIE_NAME } from './sessions.js';
import { ApiError } from '../errors.js';

export function makeRequireAuth(pg) {
  return async function requireAuth(req /* , reply */) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new ApiError({ code: 'UNAUTHENTICATED', message: 'Not signed in', statusCode: 401 });
    }
    const session = await findValidSession(pg, token);
    if (!session) {
      throw new ApiError({ code: 'UNAUTHENTICATED', message: 'Session expired', statusCode: 401 });
    }
    req.userId = session.user_id;
    req.session = session;
  };
}