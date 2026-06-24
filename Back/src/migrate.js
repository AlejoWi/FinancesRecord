// Standalone migrate script: applies every db/*.sql file in lexical order via
// the shared pg pool. Idempotent because every SQL file uses
// `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`.
//
// Usage:  npm --prefix Back run migrate
//         (or `node Back/src/migrate.js` from the repo root with a valid .env)
//
// In docker compose the migrate loop runs on container start inside the
// Dockerfile's CMD; this script is the native-dev equivalent.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { pool } from './plugins/db.js';

const here = dirname(fileURLToPath(import.meta.url));
// Back/src/migrate.js -> Back/src/.. -> Back/.. -> repo root
const dbDir = resolve(here, '..', '..', 'db');

async function main() {
  const entries = (await readdir(dbDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (entries.length === 0) {
    console.log(`migrate: no .sql files in ${dbDir}; nothing to apply.`);
    return;
  }

  for (const file of entries) {
    const sql = await readFile(join(dbDir, file), 'utf8');
    console.log(`migrate: applying ${file}`);
    await pool.query(sql);
  }

  console.log(`migrate: applied ${entries.length} file(s) from ${dbDir}`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('migrate failed:', err.message);
    pool.end().finally(() => process.exit(1));
  });
