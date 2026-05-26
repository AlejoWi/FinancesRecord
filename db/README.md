# Database scripts

PostgreSQL 15+ schema and seed data for FinancesRecord.

These scripts are intended for a **backend/API layer** that the frontend would call.
The current frontend (this repo) does **not** connect directly to PostgreSQL because
exposing DB credentials via `VITE_*` env vars would leak them to the browser bundle.

## Apply manually

```bash
psql -U finances_user -d finances_db -f db/01_schema.sql
psql -U finances_user -d finances_db -f db/02_seed.sql
```

## Files

- `01_schema.sql` — `users`, `categories`, `expenses` tables, indexes, `updated_at` triggers.
- `02_seed.sql` — seeds the four required categories.
