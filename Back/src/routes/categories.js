import { makeRequireAuth } from '../auth/middleware.js';

// GET /api/categories
// Returns the read-only category catalog. Categories are server-seeded
// (see db/02_seed.sql) and there is no admin UI in v1.
//
// Auth: required. The list is identical for all users (no per-user
// data) but we still gate it behind a valid session so anonymous
// scrapers can't enumerate the catalog cheaply.
export async function categoryRoutes(app) {
  const requireAuth = makeRequireAuth(app.pg);

  app.get('/api/categories', { preHandler: requireAuth }, async (req, reply) => {
    const { rows } = await app.pg.query(
      `SELECT id, name FROM categories ORDER BY id ASC`,
    );
    return reply.send({ categories: rows });
  });
}