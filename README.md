# FinancesRecord

Aplicación web de finanzas personales: registro y categorización de gastos, dashboard con totales por período y gráfico por categoría.

Stack: **React 18 + Vite + React Router 6 + React Hook Form + zod + Recharts** (frontend). **Node 20 + Fastify + zod + PostgreSQL** (backend — llega en PR 2).

---

## Estructura del repo

```
FinancesRecord/
├── Front/                    # React 18 + Vite 5 SPA (este PR lo dejó en su lugar)
│   ├── src/                  # components/, features/{auth,expenses,dashboard}/, store/, routes/, ...
│   ├── tests/                # Vitest (se agrega en PR 4)
│   ├── Dockerfile            # build multi-stage node:20-alpine → nginx:1.27-alpine
│   ├── nginx.conf            # SPA fallback; el proxy /api/ se agrega en PR 2
│   ├── vite.config.js        # dev server :5173; el proxy /api se agrega en PR 2
│   ├── package.json, package-lock.json, index.html
│   ├── .env.example          # solo VITE_API_BASE (placeholder, comentado)
│   ├── .gitignore, .dockerignore
│   └── vitest.config.js      # se agrega en PR 4
│
├── Back/                     # Servicio Fastify (placeholder en este PR)
│   ├── README.md             # avisa que PR 2 lo puebla
│   └── .gitkeep
│
├── db/                       # SQL idempotente — queda en la raíz, montado por el servicio db
│   ├── 01_schema.sql
│   └── 02_seed.sql
│
├── docker-compose.yml        # servicios: frontend (:8080), db (sin publicar)
├── .gitignore                # ignores a nivel repo
└── README.md
```

> **Por qué `Front/` + `Back/` + `db/` como hermanos y no npm workspaces**: este repo no necesita
> hoisting ni scripts entre paquetes. Cada lado tiene su propio `package.json` y `package-lock.json`
> independientes. El SQL vive en `db/` para que tanto `docker-compose` (al inicializar Postgres) como
> el futuro backend (en su propio loop de migrate) lo puedan montar.

---

## Requisitos

- Node.js 18+ (recomendado 20)
- npm 9+
- Docker Desktop (Windows/macOS) **o** Docker Engine + Compose v2 en Linux — solo si vas a usar el flujo dockerizado.

## Setup del frontend (modo nativo)

```bash
npm --prefix Front install
npm --prefix Front run dev      # http://localhost:5173
npm --prefix Front run build    # genera Front/dist/
npm --prefix Front run preview  # sirve Front/dist/
```

El `package.json` de `Front/` está renombrado a `financesrecord-frontend`.

> **Backend todavía no existe.** En este PR (`split/pr-1-restructure`) la app sigue persistiendo en
> `localStorage` exactamente igual que antes; el cambio es puramente de organización del repo
> y de hygiene de variables de entorno.

## Cuentas y datos (sin cambios todavía)

Los usuarios se registran desde `/register` y luego inician sesión en `/login`.
La sesión se guarda en `sessionStorage` (se pierde al cerrar la pestaña).

> **Decisión de seguridad — variable `VITE_DB_*` removida.** La especificación original
> mencionaba variables `VITE_DB_*` para uso desde el navegador. Cualquier variable `VITE_*`
> queda **expuesta en el bundle del cliente**, así que llevar credenciales de DB al frontend
> es una fuga de credenciales garantizada. Este PR elimina ese bloque de `Front/.env.example`
> y deja solo `POSTGRES_*` (que docker-compose lee server-side) más `VITE_API_BASE` (placeholder
> comentado, listo para PR 2).

Las contraseñas se hashean con **SHA-256 + salt por usuario** vía Web Crypto (`Front/src/features/auth/crypto.js`).
El esquema queda `sha256$<saltHex>$<hashHex>`. Esto se reemplaza por scrypt server-side en PR 3.

## Rutas

| Ruta              | Acceso  | Notas                                          |
|-------------------|---------|------------------------------------------------|
| `/login`          | Público | Redirige a `/dashboard` si hay sesión          |
| `/register`       | Público | Redirige a `/dashboard` si hay sesión          |
| `/dashboard`      | Privado | Total del período + gráfico por categoría      |
| `/expenses`       | Privado | Tabla con filtros por categoría y fechas       |
| `/expenses/new`   | Privado | Alta de gasto                                  |
| `/expenses/:id`   | Privado | Edición; gastos ajenos redirigen a `/expenses` |

## Limitaciones conocidas

- **No hay backend todavía**: la persistencia es local al navegador. Los scripts SQL están listos para la futura API.
- **Hashing débil por especificación**: SHA-256+salt no es adaptativo. PR 3 lo reemplaza con scrypt server-side.
- Los datos en `localStorage` son visibles para cualquier script en el mismo origen — no apto para datos sensibles reales.

---

## Docker

`docker-compose.yml` levanta el frontend (Vite build servido por nginx en `:8080`) y PostgreSQL 16
(en la red interna, **no** publicado al host). El servicio `backend` se suma en PR 2.

> El frontend sigue usando `localStorage` para persistir en esta versión. Postgres se aprovisiona
> para que el esquema y los seeds estén listos cuando exista la API server-side.

### Prerequisites

- Docker Desktop (Windows/macOS) **or** Docker Engine + Compose v2 on Linux.
- No local Node.js or Postgres install is required to run the app this way.

### Quick start

```bash
# Optional: override the default Postgres credentials.
cp Front/.env.example Front/.env

# Build the image and start both services.
docker compose up --build
```

> Nota: en este PR el build del frontend usa `context: Front` y `dockerfile: Dockerfile` (dentro
> de `Front/`). El frontend `.dockerignore` se aplica naturalmente.

Once the stack is up:

| Service     | URL / port                               | Notes                                              |
|-------------|-------------------------------------------|----------------------------------------------------|
| Frontend    | http://localhost:8080                     | Nginx serves the Vite build (`Front/dist/`).       |
| PostgreSQL  | not published to the host                 | Reachable from `frontend` over the compose network. |

Postgres stays on the internal network on purpose. To inspect it from the
host, use `docker compose exec`:

```bash
docker compose exec db psql -U finances_user -d finances_db -c '\dt'
```

### How it works

- The `frontend` service builds with `node:20-alpine` (build context is `Front/`) and the final image
  is `nginx:1.27-alpine` serving the Vite output. SPA fallback is configured in `Front/nginx.conf`
  so React Router routes survive a page refresh.
- The `db` service uses the official `postgres:16-alpine` image, mounts a
  named volume (`finances_pgdata`) for durability, and bind-mounts
  `./db` to `/docker-entrypoint-initdb.d` so `01_schema.sql` and
  `02_seed.sql` are applied on the very first boot. The init scripts are
  idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).
- `frontend` waits for the `db` healthcheck (`pg_isready`) to pass before
  starting, so the first build never races the database initialization.

### Useful commands

```bash
# Stop the stack (keeps the DB volume).
docker compose down

# Stop the stack AND wipe the Postgres volume (irreversible).
docker compose down -v

# Tail logs.
docker compose logs -f frontend
docker compose logs -f db

# Open a psql shell inside the db container.
docker compose exec db psql -U finances_user -d finances_db

# Rebuild only the frontend after source changes.
docker compose build frontend && docker compose up -d frontend
```

### Defaults and security

- The bundled defaults are `finances_user` / `changeme` / `finances_db`.
  Override them in `Front/.env` (or your shell environment) before any non-toy use.
- Postgres is **not** published to the host (`5432` is not mapped). It is
  reachable only from the `frontend` service on the internal compose
  network and from operators via `docker compose exec db ...`.
- `Front/dist/`, `Front/node_modules/`, `.env`, and other build/secret artifacts are
  excluded from the build context via `Front/.dockerignore`.

---

## Roadmap (PRs siguientes, no implementados todavía)

- **PR 2** — `Back/` skeleton: Fastify + `/healthz` + `/readyz` + pg pool + migrate loop + `backend` service en compose + `/api/` proxy en `Front/nginx.conf` y `Front/vite.config.js`.
- **PR 3** — Auth + sessions + scrypt: `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`, scrypt server-side, sesiones en `db/03_sessions.sql`, rewiring de `SessionContext.jsx` para usar `api.post(...)` en vez de `localStore` + `crypto.js`.
- **PR 4** — Expenses + categories + dashboard + cut the cord: rutas CRUD de gastos, dashboard con `GROUP BY` server-side, rewiring de las tres páginas, borrado de `localStore.js` + `categories.js` + `crypto.js`, migración one-shot de `localStorage` al backend en el primer login.

Fuera de scope v1 (a abrir como cambios aparte si se quieren): pre-commit hooks (husky + lint-staged), GitHub Actions CI, rate limiting, email verification, password reset, deploy de producción / TLS / secret manager, admin UI de categorías, paginación de gastos, observabilidad.