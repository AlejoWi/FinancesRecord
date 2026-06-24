# Back/

Backend service for FinancesRecord.

**Status**: placeholder. PR 2 (`feat: scaffold Fastify backend with /healthz and /api proxy in dev + prod`) will populate this directory with the Node 20 + Fastify + zod + `pg` service, the `/healthz` + `/readyz` routes, the pg pool + migrate loop, the multi-stage `Dockerfile`, the Vitest smoke tests, and the `docker-compose.yml` `backend` service wiring.

Until then, this folder is intentionally empty except for this README and `.gitkeep`. The repo's frontend keeps running unchanged in `Front/` against `localStorage`; the `db/` SQL files at the repo root are the schema/seed the future backend will apply.