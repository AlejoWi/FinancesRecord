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
