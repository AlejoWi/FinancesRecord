import { z } from 'zod';

// NOTE: this file used to import CATEGORIES from `db/categories.js`.
// That module is removed in the PR 4 frontend chunk; the category
// catalog is now served by the backend at /api/categories. We keep
// a static list of valid IDs here purely as a UX nicety so the form
// can surface a friendly "categoría inválida" before round-tripping
// to the server (the server is still the source of truth and will
// reject with UNKNOWN_CATEGORY on a miss). The IDs mirror the seed
// data in /db/02_seed.sql.
const VALID_CATEGORY_IDS = [1, 2, 3, 4];

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const expenseSchema = z.object({
  amount: z
    .coerce.number({ invalid_type_error: 'Monto inválido' })
    .positive('Debe ser mayor a 0')
    .finite('Monto inválido'),
  categoryId: z.coerce
    .number()
    .refine((v) => VALID_CATEGORY_IDS.includes(v), 'Categoría inválida'),
  description: z
    .string()
    .trim()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  expenseDate: z
    .string()
    .min(1, 'Fecha requerida')
    .refine((d) => d <= todayIso(), 'La fecha no puede ser futura'),
});
