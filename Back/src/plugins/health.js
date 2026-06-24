// Health and readiness routes. Both public (no auth) so Docker healthchecks
// and load balancers can poll them without a session cookie.
//
// - /healthz: liveness. The process is up. NEVER touches the DB. Used by
//   Docker's `restart: unless-stopped` loop and Kubernetes liveness probes.
// - /readyz:  readiness. The process can serve traffic. Runs `SELECT 1`
//   against the pool. Returns 503 when the DB is unreachable. Used as
//   Docker's `healthcheck.test` target and Kubernetes readiness probes.
export async function healthRoutes(app) {
  app.get('/healthz', async () => ({
    status: 'ok',
    uptimeSec: Math.round(process.uptime()),
  }));

  app.get('/readyz', async (req, reply) => {
    try {
      await app.pg.query('SELECT 1');
      return { status: 'ok' };
    } catch (err) {
      req.log.warn({ err }, 'readiness check failed');
      return reply
        .code(503)
        .send({ status: 'unavailable', error: 'DB_UNREACHABLE' });
    }
  });
}
