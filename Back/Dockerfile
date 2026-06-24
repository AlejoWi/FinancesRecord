# Multi-stage build for the Fastify backend.
#
# Design notes (see design §3, B2 fix):
#   - node:20-alpine is used in BOTH stages. The runtime stage installs
#     `postgresql-client` so the migrate loop in CMD can run psql.
#   - The migrate loop guards with `[ -f "$f" ] || continue` so PR 3's
#     03_sessions.sql (which doesn't exist yet) won't crash on first start.
#   - `db/*.sql` files are bind-mounted into the build context from the repo
#     root COPY below. The db service also runs them on first init via
#     /docker-entrypoint-initdb.d, so the SQL is idempotent on a fresh
#     volume and a no-op on an existing one.

# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install ALL deps (including devDeps like vitest) for the test step inside this
# stage. Production image will only get the prod deps via `npm ci --omit=dev`.
# Build context is the repo root (see docker-compose.yml), so we COPY from Back/.
COPY Back/package.json Back/package-lock.json ./
RUN npm ci

# Cache test results — not strictly needed, but cheap and makes the build
# reproducible. Skipped here for size; tests run in CI.

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app

# postgresql-client is NOT in the base image. Required so the migrate loop in
# CMD can run `psql -f`. ~5MB overhead. Alternative would be a separate
# migrate container (overkill for v1).
RUN apk add --no-cache postgresql-client

# Install prod-only deps (from the build context root).
COPY Back/package.json Back/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the source (relative to the repo-root build context).
COPY Back/src/ ./src/

# Copy the SQL files for the migrate loop. db/ is a sibling of Back/ in the
# repo, so it lives at the build context root — not under Back/.
COPY db/ ./db/

# Drop privileges. node:20-alpine already has a `node` user.
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck: /healthz must be reachable. Compose's `depends_on:
# condition: service_healthy` will use this.
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

# Run every *.sql file in lexical order, then exec the server. The
# `[ -f "$f" ] || continue` guard keeps the loop safe if a future
# 03_sessions.sql is added in a follow-up change.
CMD ["sh", "-c", "for f in /app/db/*.sql; do [ -f \"$f\" ] || continue; echo \"migrate: applying $f\"; psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f \"$f\" || exit 1; done; exec node src/server.js"]
