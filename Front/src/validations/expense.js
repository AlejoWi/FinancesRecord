import { z } from 'zod';
import { CATEGORIES } from '../db/categories.js';

const validCategoryIds = CATEGORIES.map((c) => c.id);

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
  category_id: z.coerce
    .number()
    .refine((v) => validCategoryIds.includes(v), 'Categoría inválida'),
  description: z
    .string()
    .trim()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  expense_date: z
    .string()
    .min(1, 'Fecha requerida')
    .refine((d) => d <= todayIso(), 'La fecha no puede ser futura'),
});
