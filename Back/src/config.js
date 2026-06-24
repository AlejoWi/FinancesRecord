import 'dotenv/config';
import { z } from 'zod';

// Server-only environment. Validated once at module load.
// Add fields here as new env vars are introduced (PR 3 will add SESSION_TTL_DAYS, etc.).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Required in production (PR 3 wires it into the cookie signer). Optional in dev/test
  // so contributors can boot the server without generating a secret up front.
  COOKIE_SECRET: z.string().min(16).optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === 'production' && !env.COOKIE_SECRET) {
  console.error('COOKIE_SECRET is required when NODE_ENV=production.');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
  process.exit(1);
}

export const config = Object.freeze(env);
