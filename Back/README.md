# Back/

Fastify backend for FinancesRecord. Implements user auth (PR 3 — shipped), expense CRUD + categories + dashboard + localStorage migration (PR 4 — pending). PR 2 shipped the skeleton: `/healthz`, `/readyz`, the pg pool, the SQL migrate loop, and the docker-compose wiring.

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

## Auth endpoints (PR 3)

All auth endpoints exchange JSON and set the `fr_session` cookie on success. The cookie is `HttpOnly` + `SameSite=Lax` always; `Secure` only when `NODE_ENV=production`. TTL: 7 days, sliding (extended on each authenticated request).

| Method | Path                  | Body                                       | Success                         | Failure codes                                                |
|--------|-----------------------|--------------------------------------------|---------------------------------|--------------------------------------------------------------|
| POST   | `/api/auth/register`  | `{ name, email, password }`                | `201` + `{ user }` + cookie     | `409 EMAIL_TAKEN`, `400 VALIDATION_FAILED`, `400 PASSWORD_TOO_SHORT` |
| POST   | `/api/auth/login`     | `{ email, password }`                      | `200` + `{ user }` + cookie     | `401 INVALID_CREDENTIALS` (constant-time)                    |
| POST   | `/api/auth/logout`    | (empty)                                    | `204` + clears cookie           | (none — always 204 even without a session)                   |
| GET    | `/api/auth/me`        | (none)                                     | `200` + `{ user }`              | `401 UNAUTHENTICATED`                                        |

All error responses use the spec envelope: `{ "error": "CODE", "message": "...", "requestId": "..." }`. Validation errors additionally include `issues: [{ path, message, code }]`.

Password storage uses `node:crypto.scrypt` with `N=32768, r=8, p=1, maxmem=64 MiB`. The on-disk format is `scrypt$N=32768,r=8,p=1$<saltHex>$<hashHex>`, stored in `users.password_hash` (VARCHAR(255)).

Sessions are stored server-side in the `sessions` table (see `db/03_sessions.sql`). The cookie carries an opaque random token; the server stores only its SHA-256 hash, so a DB compromise does not leak valid session tokens.

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
