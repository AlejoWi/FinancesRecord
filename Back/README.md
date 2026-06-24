# Back/

Fastify backend for FinancesRecord. Implements user auth (PR 3), expense CRUD + categories + dashboard (PR 4), and a localStorage migration hook (PR 4). PR 2 ships only the skeleton: `/healthz`, `/readyz`, the pg pool, the SQL migrate loop, and the docker-compose wiring.

## Requirements
- Node.js 20+
- npm 9+
- A reachable PostgreSQL 16 instance (locally, via `docker compose up -d db`, or remote)

## Setup (native dev)

```bash
npm --prefix Back install
cp Back/.env.example Back/.env
# Edit Back/.env — at minimum set DATABASE_URL.
# In dev COOKIE_SECRET is optional (the server refuses to start without it in production only).
npm --prefix Back run dev
```

The server binds to `0.0.0.0:3000`. Health endpoints:
- `curl http://localhost:3000/healthz` → 200 always (no DB call)
- `curl http://localhost:3000/readyz`  → 200 if `SELECT 1` succeeds, 503 otherwise

## Migrate the schema

```bash
npm --prefix Back run migrate
```

Reads every `db/*.sql` file in lexical order and applies them via the shared pg pool. Idempotent — every script uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`. In docker compose this happens automatically on container start (the Dockerfile's CMD runs the same loop before `exec node src/server.js`).

## Run tests

```bash
npm --prefix Back test
```

PR 2 ships only the `/healthz` smoke test. PR 3 adds session-cookie injection + auth tests; PR 4 adds the expense/CRUD tests.

## Dev workflow (the rules)

1. **Backend in dev runs NATIVE on the host** (`npm --prefix Back run dev`). The Vite dev proxy points at `localhost:3000`, which only works if the backend is on the host. Do NOT use `docker compose up backend` for dev — the proxy will 404.
2. **Use `docker compose up -d db` for the database** in dev. The `db` service is the only one you need containerized during feature work.
3. **`docker compose up backend`** is for prod-like verification (full stack, real nginx, real `/api/` proxy through the frontend container). Use it before opening a PR.
4. **Run `npm run migrate` after pulling changes that add a new `db/*.sql` file.** Or `docker compose restart backend` to let the container's CMD do it.
5. **Cookie Secret in production**: `COOKIE_SECRET` is required when `NODE_ENV=production`. The docker-compose service refuses to start without it. Generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```
   and inject it via the shell environment or a `.env` file at the repo root (compose reads it automatically via `${COOKIE_SECRET}`).

## Layout

```
Back/
├── src/
│   ├── config.js          # zod-validated env (DATABASE_URL, PORT, NODE_ENV, COOKIE_SECRET)
│   ├── migrate.js         # standalone `npm run migrate` script
│   ├── server.js          # Fastify entry: buildApp() + listen
│   └── plugins/
│       ├── db.js          # pg.Pool singleton + Fastify plugin
│       └── health.js      # /healthz + /readyz
├── tests/
│   └── health.test.js     # Vitest smoke test
├── Dockerfile             # multi-stage node:20-alpine + postgresql-client
├── vitest.config.js
├── package.json
├── .env.example
├── .gitignore
└── .dockerignore
```

## What's NOT here yet
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — PR 3
- `GET/POST/PATCH/DELETE /api/expenses`, `GET /api/expenses/summary` — PR 4
- `GET /api/categories` — PR 4
- Session cookie signing/verification, scrypt password hashing — PR 3
- The localStorage wipe hook (one-shot migration to the backend) — PR 4
