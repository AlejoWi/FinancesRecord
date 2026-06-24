import { hashPassword, verifyPassword, getDummyHash } from '../auth/passwords.js';
import {
  COOKIE_NAME,
  buildSessionCookie,
  buildClearSessionCookie,
  createSession,
  findValidSession,
  deleteSession,
} from '../auth/sessions.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import { ApiError } from '../errors.js';

// Public projection of a user (never includes password_hash).
function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function authRoutes(app) {
  // POST /api/auth/register
  app.post('/api/auth/register', async (req, reply) => {
    const body = registerSchema.parse(req.body); // throws ZodError → 400 VALIDATION_FAILED
    const email = body.email;
    const existing = await app.pg.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rowCount > 0) {
      // Constant-time: hash a dummy value before returning, so the
      // timing matches the "new user" path. Prevents email enumeration.
      // The error code + message are GENERIC (REGISTRATION_FAILED) — we
      // must not reveal whether the email already exists. The 409 status
      // tells the client the form was rejected; the body says nothing
      // about the email.
      await hashPassword(body.password);
      throw new ApiError({ code: 'REGISTRATION_FAILED', message: 'No fue posible completar el registro. Intentá nuevamente.', statusCode: 409 });
    }
    const passwordHash = await hashPassword(body.password);
    const inserted = await app.pg.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [body.name, email, passwordHash],
    );
    const user = inserted.rows[0];
    const { token } = await createSession(app.pg, user.id);
    reply.header('Set-Cookie', buildSessionCookie(token));
    return reply.code(201).send({ user: publicUser(user) });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const found = await app.pg.query(
      `SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1`,
      [body.email],
    );
    // Constant-time: if user not found, verify against a dummy hash so
    // the scrypt timing matches the "user exists" path.
    const user = found.rows[0];
    const hashToCheck = user ? user.password_hash : await getDummyHash();
    const ok = await verifyPassword(body.password, hashToCheck);
    if (!user || !ok) {
      // Generic error code + message; the user already submitted
      // credentials so "email or password incorrect" doesn't leak
      // whether the email exists (the response is the same for both).
      throw new ApiError({ code: 'LOGIN_FAILED', message: 'Email o contraseña incorrectos', statusCode: 401 });
    }
    const { token } = await createSession(app.pg, user.id);
    reply.header('Set-Cookie', buildSessionCookie(token));
    return reply.send({ user: publicUser(user) });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await deleteSession(app.pg, token);
    reply.header('Set-Cookie', buildClearSessionCookie());
    return reply.code(204).send();
  });

  // GET /api/auth/me
  app.get('/api/auth/me', async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      throw new ApiError({ code: 'UNAUTHENTICATED', message: 'Not signed in', statusCode: 401 });
    }
    const session = await findValidSession(app.pg, token);
    if (!session) {
      throw new ApiError({ code: 'UNAUTHENTICATED', message: 'Session expired', statusCode: 401 });
    }
    const { rows } = await app.pg.query(
      `SELECT id, name, email, created_at FROM users WHERE id = $1`,
      [session.user_id],
    );
    if (rows.length === 0) {
      // User was deleted while session was alive (FK ON DELETE CASCADE
      // should have removed the session, but be defensive).
      throw new ApiError({ code: 'UNAUTHENTICATED', message: 'Session invalid', statusCode: 401 });
    }
    return reply.send({ user: publicUser(rows[0]) });
  });
}
