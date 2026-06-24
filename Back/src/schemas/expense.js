import { z } from 'zod';

// Money: JSON number coerced to 2 decimals. Reject non-finite or out-of-range.
function money() {
  return z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const n = typeof v === 'string' ? Number(v) : v;
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'amount must be a finite number' });
        return z.NEVER;
      }
      if (n <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'amount must be greater than 0' });
        return z.NEVER;
      }
      if (n > 9999999999.99) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'amount is too large' });
        return z.NEVER;
      }
      // Return as Number with 2-decimal precision (NUMERIC(12,2) in DB).
      return Number(n.toFixed(2));
    });
}

// Date: YYYY-MM-DD string (HTML date input format). The DB column is DATE.
function dateString() {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .refine((s) => !Number.isNaN(new Date(s).getTime()), 'date is invalid');
}

export const createExpenseSchema = z.object({
  categoryId: z.coerce.number().int().positive('categoryId must be a positive integer'),
  amount: money(),
  description: z.string().max(255).nullable().optional().transform((v) => v ?? null),
  expenseDate: dateString(),
});

export const updateExpenseSchema = z
  .object({
    categoryId: z.coerce.number().int().positive().optional(),
    amount: money().optional(),
    description: z.string().max(255).nullable().optional(),
    expenseDate: dateString().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'patch must include at least one field' });

// Query params for list endpoint
export const listExpensesQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  from: dateString().optional(),
  to: dateString().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});