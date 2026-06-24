# FinancesRecord

Aplicación web de finanzas personales: registro y categorización de gastos con
dashboard de totales por período. Stack: **React 18 + Vite** (frontend),
**Node 20 + Fastify** (backend), **PostgreSQL 16** (persistencia).

Este repositorio está preparado para ejecutarse íntegramente con Docker. No
hace falta instalar Node ni Postgres en la máquina host.

---

## Requisitos

- **Docker Desktop** (Windows / macOS) o **Docker Engine + Compose v2** (Linux).
- Puerto **8080** libre en el host (frontend nginx).
- `COOKIE_SECRET` definido en el entorno antes del primer `up` — el backend lo
  usa para firmar las cookies de sesión. El `docker-compose.yml` falla en
  arranque si no está seteado.

---

## Quick start

### 1. Generar el `COOKIE_SECRET`

Necesitás un valor aleatorio de al menos 32 bytes. Cualquiera de estas formas
vale; usá la que tengas a mano:

```bash
# OpenSSL
openssl rand -hex 32

# Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell (Windows)
[Convert]::ToHexString((New-Object byte[] 32 | ForEach-Object { Get-Random -Max 256 }))
```

### 2. Crear un `.env` en la raíz del repo

```bash
# .env  (en la raíz, junto a docker-compose.yml)

# --- requerido ---
COOKIE_SECRET=pega-aqui-el-valor-que-generaste

# --- opcional: override de credenciales Postgres ---
# POSTGRES_USER=finances_user
# POSTGRES_PASSWORD=changeme
# POSTGRES_DB=finances_db
```

> Las credenciales de Postgres por defecto (`finances_user` / `changeme` /
> `finances_db`) sirven para development local. Cambialas antes de cualquier
> uso no recreativo.

### 3. Levantar la stack

```bash
docker compose up --build
```

La primera build tarda unos minutos (instala deps de `Front/` y `Back/` y
compila el bundle de Vite). En arranques posteriores es instantánea.

### 4. Abrir la app

| Servicio     | URL / puerto                | Notas                                          |
|--------------|-----------------------------|------------------------------------------------|
| **Frontend** | http://localhost:8080       | Nginx sirve el build de Vite (`Front/dist/`).  |
| Backend      | `http://backend:3000` (interno) | API Fastify — solo accesible desde la red de compose. |
| PostgreSQL   | `db:5432` (interno)         | No se publica al host. Solo via `docker compose exec`. |

El frontend nginx ya tiene configurado el proxy `/api/` hacia el backend, así
que el navegador habla contra el mismo origen (`localhost:8080/api/...`).

---

## Comandos útiles

```bash
# Levantar en segundo plano
docker compose up -d --build

# Ver logs
docker compose logs -f
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db

# Inspeccionar la base de datos
docker compose exec db psql -U finances_user -d finances_db

# Reconstruir un solo servicio (ej. después de tocar código de Front/)
docker compose build frontend && docker compose up -d frontend

# Apagar la stack (conserva el volumen de Postgres)
docker compose down

# Apagar y BORRAR la base de datos (irreversible)
docker compose down -v
```

---

## Estructura relevante

```
FinancesRecord/
├── Front/                 # React 18 + Vite (build → nginx)
│   ├── Dockerfile
│   ├── nginx.conf         # SPA fallback + proxy /api/ → backend
│   └── src/
├── Back/                  # Fastify API
│   ├── Dockerfile         # node:20-alpine + psql + migrate loop en CMD
│   └── src/
├── db/                    # SQL idempotente, montado por el servicio db
│   ├── 01_schema.sql
│   └── 02_seed.sql
├── docker-compose.yml     # frontend (:8080) + backend + db
└── .env                   # COOKIE_SECRET (obligatorio), Postgres (opcional)
```

---

## Troubleshooting

- **`COOKIE_SECRET must be set`** al hacer `docker compose up`: revisá que
  `.env` exista en la raíz y contenga la variable. Compose lee `.env`
  automáticamente.
- **El frontend no responde en :8080**: `docker compose logs frontend` — suele
  ser que el build de Vite falló en la primera etapa del Dockerfile.
- **El backend no arranca**: `docker compose logs backend`. El `migrate loop`
  en el CMD corre `psql` contra la URL de `DATABASE_URL`; si la db no terminó
  de inicializar, reintentá unos segundos (compose ya espera al healthcheck).
- **Quiero empezar de cero**: `docker compose down -v` borra el volumen
  `finances_pgdata` y deja la stack como recién instalada.
