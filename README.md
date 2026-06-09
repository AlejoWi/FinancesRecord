# FinancesRecord

Aplicación web de finanzas personales: registro y categorización de gastos, dashboard con totales por período y gráfico por categoría.

Stack: **React 18 + Vite + React Router 6 + React Hook Form + zod + Recharts**.

---

## Requisitos

- Node.js 18+ (recomendado 20)
- npm 9+

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/
```

(Opcional) Copiar `.env.example` a `.env` si se va a integrar con un backend.

---

## Cuentas y datos

Los usuarios se registran desde `/register` y luego inician sesión en `/login`.
La sesión se guarda en `sessionStorage` (se pierde al cerrar la pestaña).

> **Decisión importante** — La especificación pide usar `postgres.js` desde el navegador con variables `VITE_DB_*`. Cualquier variable `VITE_*` queda **expuesta en el bundle del cliente**, por lo que enviar credenciales de DB a producción de esa forma sería una fuga de credenciales.
>
> Por eso esta versión persiste usuarios y gastos en `localStorage` y entrega los **scripts SQL** en `/db` para que un backend/migración real los aplique cuando exista una API server-side.

Las contraseñas se hashean con **SHA-256 + salt por usuario** vía Web Crypto (`src/features/auth/crypto.js`). El esquema queda `sha256$<saltHex>$<hashHex>`.

---

## Estructura

```
db/
  01_schema.sql       PostgreSQL — tablas, índices, triggers updated_at
  02_seed.sql         Categorías iniciales (Vivienda, Ocio, Transporte, Alimentación)
  README.md
src/
  components/layout/  Layout con header + navegación
  db/                 localStore.js (persistencia local), categories.js (catálogo)
  features/
    auth/             LoginPage, RegisterPage, crypto.js (SHA-256+salt)
    expenses/         Lista, formulario create/edit
    dashboard/        DashboardPage con Recharts
  routes/             AppRoutes (privadas/públicas)
  store/              SessionContext (Context global)
  validations/        zod schemas (auth, expense)
  styles/             global.css responsive
  App.jsx / main.jsx
spect/especificacion.md
```

---

## Rutas

| Ruta              | Acceso  | Notas                                          |
|-------------------|---------|------------------------------------------------|
| `/login`          | Público | Redirige a `/dashboard` si hay sesión          |
| `/register`       | Público | Redirige a `/dashboard` si hay sesión          |
| `/dashboard`      | Privado | Total del período + gráfico por categoría      |
| `/expenses`       | Privado | Tabla con filtros por categoría y fechas       |
| `/expenses/new`   | Privado | Alta de gasto                                  |
| `/expenses/:id`   | Privado | Edición; gastos ajenos redirigen a `/expenses` |

---

## Limitaciones conocidas

- **No hay backend**: la persistencia es local al navegador. Los scripts SQL están listos para una futura API.
- **Hashing débil por especificación**: SHA-256+salt no es adaptativo. Para producción se debería usar bcrypt/argon2 en el servidor.
- Los datos en `localStorage` son visibles para cualquier script en el mismo origen — no apto para datos sensibles reales.

---

## Docker

The repository ships with a multi-stage `Dockerfile` and a `docker-compose.yml`
that bring up the SPA and a PostgreSQL 16 database on a private compose network.

> The frontend keeps using `localStorage` for persistence in this version.
> Postgres is provisioned only so the database, schema, and seed data are
> ready for the future backend service.

### Prerequisites

- Docker Desktop (Windows/macOS) **or** Docker Engine + Compose v2 on Linux.
- No local Node.js or Postgres install is required to run the app this way.

### Quick start

```bash
# Optional: override the default Postgres credentials.
cp .env.example .env

# Build the image and start both services.
docker compose up --build
```

Once the stack is up:

| Service     | URL / port                               | Notes                                              |
|-------------|-------------------------------------------|----------------------------------------------------|
| Frontend    | http://localhost:8080                     | Nginx serves the Vite build (`dist/`).             |
| PostgreSQL  | not published to the host                 | Reachable from `frontend` over the compose network. |

Postgres stays on the internal network on purpose. To inspect it from the
host, use `docker compose exec`:

```bash
docker compose exec db psql -U finances_user -d finances_db -c '\dt'
```

### How it works

- The `frontend` service builds with `node:20-alpine` and the final image is
  `nginx:1.27-alpine` serving the Vite output. SPA fallback is configured in
  `nginx.conf` so React Router routes survive a page refresh.
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
  Override them in `.env` (or your shell environment) before any non-toy use.
- Postgres is **not** published to the host (`5432` is not mapped). It is
  reachable only from the `frontend` service on the internal compose
  network and from operators via `docker compose exec db ...`.
- `dist/`, `node_modules/`, `.env`, and other build/secret artifacts are
  excluded from the build context via `.dockerignore`.
