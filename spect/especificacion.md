# FinancesRecord — Especificación de Aplicación

**Versión:** 1.0.0  
**Fecha:** 2026-05-25  
**Estado:** Borrador

---

## 1. Descripción General

FinancesRecord es una aplicación web de finanzas personales que permite a los usuarios registrar, visualizar y analizar sus gastos organizados por categorías predefinidas. El objetivo es brindar una herramienta simple y clara para el control del presupuesto personal.

---

## 2. Alcance

### Incluido en v1.0
- Autenticación: registro e inicio de sesión de usuarios.
- CRUD de gastos con categorización.
- Dashboard con resumen de gastos por categoría y período.
- Filtros por categoría y rango de fechas.

### Fuera de alcance (v1.0)
- Ingresos / presupuestos mensuales.
- Exportación a PDF/Excel.
- Notificaciones y alertas.
- Aplicación móvil nativa.

---

## 3. Requisitos Funcionales

### 3.1 Módulo de Autenticación

| ID  | Requisito                                                                 | Prioridad |
|-----|---------------------------------------------------------------------------|-----------|
| A01 | El usuario puede registrarse con nombre, email y contraseña.              | Alta      |
| A02 | La contraseña debe tener mínimo 8 caracteres.                             | Alta      |
| A03 | El email debe ser único por usuario.                                      | Alta      |
| A04 | El usuario puede iniciar sesión con email y contraseña.                   | Alta      |
| A05 | Al autenticar correctamente, los datos del usuario se guardan en el estado global de sesión. | Alta  |
| A06 | La sesión persiste mientras el usuario no cierre el navegador (sessionStorage).              | Alta  |
| A07 | El usuario puede cerrar sesión; el estado de sesión se limpia completamente.                 | Media |
| A08 | Las contraseñas se almacenan con hash en la base de datos (algoritmo: SHA-256 + salt).       | Alta  |

### 3.2 Módulo de Gastos

| ID  | Requisito                                                                                     | Prioridad |
|-----|-----------------------------------------------------------------------------------------------|-----------|
| G01 | El usuario puede registrar un gasto con: monto, categoría, descripción y fecha.              | Alta      |
| G02 | Las categorías disponibles son: **Vivienda**, **Ocio**, **Transporte**, **Alimentación**.     | Alta      |
| G03 | El monto debe ser un número positivo mayor a 0.                                               | Alta      |
| G04 | La fecha del gasto es requerida y no puede ser futura.                                        | Alta      |
| G05 | La descripción es opcional (máximo 255 caracteres).                                           | Media     |
| G06 | El usuario puede editar cualquier gasto propio.                                               | Alta      |
| G07 | El usuario puede eliminar cualquier gasto propio.                                             | Alta      |
| G08 | El usuario solo puede ver y gestionar sus propios gastos.                                     | Alta      |
| G09 | El listado de gastos puede filtrarse por categoría.                                           | Media     |
| G10 | El listado de gastos puede filtrarse por rango de fechas.                                     | Media     |
| G11 | El listado muestra: fecha, categoría, descripción y monto. Orden: fecha descendente.         | Alta      |

### 3.3 Dashboard

| ID  | Requisito                                                                               | Prioridad |
|-----|-----------------------------------------------------------------------------------------|-----------|
| D01 | El dashboard muestra el total gastado en el mes actual.                                 | Alta      |
| D02 | El dashboard muestra el total gastado por cada categoría en el mes actual.              | Alta      |
| D03 | El usuario puede cambiar el período del dashboard (mes actual, mes anterior, año).      | Media     |

---

## 4. Requisitos No Funcionales

| ID   | Requisito                                                                                        |
|------|--------------------------------------------------------------------------------------------------|
| NF01 | La aplicación debe responder en menos de 2 segundos bajo carga normal.                           |
| NF02 | Todas las operaciones sobre gastos requieren sesión activa; de lo contrario redirigen al login.  |
| NF03 | Los errores de operación se muestran al usuario con un mensaje legible en la interfaz.           |
| NF04 | La aplicación es responsive: funciona correctamente en desktop y mobile.                         |
| NF05 | Las variables de entorno sensibles (cadena de conexión a DB) no se incluyen en el código.        |

---

## 5. Stack Tecnológico

### Frontend
| Tecnología      | Versión mínima | Rol                                          |
|-----------------|----------------|----------------------------------------------|
| React           | 18.x           | Framework de UI                              |
| React Router    | 6.x            | Navegación SPA                               |
| React Hook Form | 7.x            | Manejo de formularios y validaciones         |
| Recharts        | 2.x            | Gráficos del dashboard                       |
| postgres.js     | 3.x            | Cliente PostgreSQL para conexión directa a DB|
| zod             | 3.x            | Validación de esquemas en cliente            |

### Base de Datos
| Tecnología  | Versión mínima | Rol            |
|-------------|----------------|----------------|
| PostgreSQL  | 15.x           | Base de datos  |

### Infraestructura / DevOps
| Herramienta    | Rol                                      |
|----------------|------------------------------------------|
| Docker         | Contenedor de la base de datos           |
| Docker Compose | Orquestación local (app + db)            |
| GitHub Actions | CI/CD pipeline                           |

---

## 6. Modelo de Base de Datos

### 6.1 Diagrama Entidad-Relación (simplificado)

```
users (1) ──────────< (N) expenses
```

### 6.2 Tabla: `users`

| Columna      | Tipo          | Restricciones                        |
|--------------|---------------|--------------------------------------|
| id           | UUID          | PK, default gen_random_uuid()        |
| name         | VARCHAR(100)  | NOT NULL                             |
| email        | VARCHAR(255)  | NOT NULL, UNIQUE                     |
| password_hash| VARCHAR(255)  | NOT NULL                             |
| created_at   | TIMESTAMPTZ   | NOT NULL, default NOW()              |
| updated_at   | TIMESTAMPTZ   | NOT NULL, default NOW()              |

### 6.3 Tabla: `categories` (datos semilla)

| Columna | Tipo         | Restricciones        |
|---------|--------------|----------------------|
| id      | SERIAL       | PK                   |
| name    | VARCHAR(50)  | NOT NULL, UNIQUE     |

**Registros iniciales:**
```
1 | Vivienda
2 | Ocio
3 | Transporte
4 | Alimentación
```

### 6.4 Tabla: `expenses`

| Columna      | Tipo          | Restricciones                                 |
|--------------|---------------|-----------------------------------------------|
| id           | UUID          | PK, default gen_random_uuid()                 |
| user_id      | UUID          | NOT NULL, FK → users(id) ON DELETE CASCADE    |
| category_id  | INTEGER       | NOT NULL, FK → categories(id)                 |
| amount       | NUMERIC(12,2) | NOT NULL, CHECK (amount > 0)                  |
| description  | VARCHAR(255)  | NULLABLE                                      |
| expense_date | DATE          | NOT NULL                                      |
| created_at   | TIMESTAMPTZ   | NOT NULL, default NOW()                       |
| updated_at   | TIMESTAMPTZ   | NOT NULL, default NOW()                       |

**Índices:**
- `idx_expenses_user_id` en `user_id`
- `idx_expenses_expense_date` en `expense_date`
- `idx_expenses_category_id` en `category_id`

---

## 7. Estructura de Carpetas

```
FinancesRecord/
├── public/
└── src/
    ├── assets/
    ├── components/         # Componentes reutilizables
    │   ├── ui/             # Botones, inputs, cards
    │   └── layout/         # Header, Sidebar, PageWrapper
    ├── features/
    │   ├── auth/           # Login, Register
    │   ├── expenses/       # Lista, Formulario, Detalle
    │   └── dashboard/      # Resumen, Gráficos
    ├── hooks/              # Custom hooks
    ├── db/                 # Conexión y queries a PostgreSQL
    │   ├── client.js       # Instancia de postgres.js
    │   ├── users.js        # Queries de usuarios
    │   ├── expenses.js     # Queries de gastos
    │   └── categories.js   # Queries de categorías
    ├── store/              # Estado global de sesión (Context)
    ├── routes/             # Rutas protegidas y públicas
    ├── validations/        # Esquemas zod
    └── main.jsx

spect/
└── especificacion.md       # Este archivo

docker-compose.yml          # PostgreSQL en contenedor
README.md
```

---

## 8. Pantallas de la Aplicación

| Ruta              | Pantalla          | Acceso     | Descripción                                        |
|-------------------|-------------------|------------|----------------------------------------------------|
| `/login`          | Login             | Público    | Formulario email + contraseña                      |
| `/register`       | Registro          | Público    | Formulario nombre + email + contraseña             |
| `/dashboard`      | Dashboard         | Privado    | Totales del período + gráfico por categoría        |
| `/expenses`       | Lista de gastos   | Privado    | Tabla filtrable de gastos                          |
| `/expenses/new`   | Nuevo gasto       | Privado    | Formulario de creación                             |
| `/expenses/:id`   | Editar gasto      | Privado    | Formulario de edición con datos precargados        |

**Reglas de navegación:**
- Rutas privadas redirigen a `/login` si no hay sesión activa en el store.
- Rutas públicas redirigen a `/dashboard` si ya hay sesión activa.

---

## 9. Manejo de Errores

| Escenario                                         | Comportamiento en UI                                        |
|---------------------------------------------------|-------------------------------------------------------------|
| Campos de formulario inválidos                    | Mensaje de error inline bajo el campo correspondiente       |
| Email ya registrado                               | Mensaje: "El email ya está en uso"                          |
| Credenciales incorrectas al iniciar sesión        | Mensaje: "Email o contraseña incorrectos"                   |
| Sesión expirada o inexistente en ruta privada     | Redirección automática a `/login`                           |
| Error de conexión a la base de datos              | Mensaje genérico: "Error al conectar con la base de datos" |
| Intento de acceder a un gasto de otro usuario     | Redirección a `/expenses` sin mostrar el recurso            |

---

## 10. Variables de Entorno

### `.env` (raíz del proyecto)
```
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=finances_db
VITE_DB_USER=finances_user
VITE_DB_PASSWORD=<contraseña local>
```

> Las variables con prefijo `VITE_` son expuestas por Vite al bundle del cliente. La conexión a la base de datos se establece desde `src/db/client.js` usando estas variables.

---

## 11. Criterios de Aceptación (resumen)

- [ ] Un usuario nuevo puede registrarse y ser redirigido al dashboard.
- [ ] Un usuario registrado puede iniciar sesión con email y contraseña correctos.
- [ ] Un usuario con sesión activa puede crear un gasto con monto, categoría y fecha.
- [ ] Los gastos creados aparecen en el listado ordenados por fecha descendente.
- [ ] El usuario puede editar y eliminar sus propios gastos.
- [ ] Un usuario no puede ver ni modificar gastos de otro usuario.
- [ ] El dashboard muestra el total del mes y el desglose por categoría.
- [ ] Al cerrar sesión o acceder sin sesión, el usuario es redirigido al login.
