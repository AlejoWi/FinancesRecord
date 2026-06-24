import { makeRequireAuth } from '../auth/middleware.js';
import { z } from 'zod';
import { ApiError } from '../errors.js';

// Period shapes the time window. The frontend picks one of these.
//   - 'current_month'  (default): from the 1st of this month to today
//   - 'previous_month': the full previous calendar month
//   - 'year'           : the current calendar year (Jan 1 to today)
const querySchema = z.object({
  period: z.enum(['current_month', 'previous_month', 'year']).default('current_month'),
});

function rangeForPeriod(period, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-indexed
  if (period === 'current_month') {
    const from = new Date(Date.UTC(y, m, 1));
    const to = new Date(Date.UTC(y, m, now.getUTCDate(), 23, 59, 59, 999));
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }
  if (period === 'previous_month') {
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last of prev
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }
  if (period === 'year') {
    return { from: `${y}-01-01`, to: now.toISOString().slice(0, 10) };
  }
  throw new ApiError({ code: 'INVALID_PERIOD', message: 'Unknown period', statusCode: 400 });
}

export async function dashboardRoutes(app) {
  const requireAuth = makeRequireAuth(app.pg);

  // GET /api/dashboard?period=current_month|previous_month|year
  // Returns:
  //   - total: sum of amount in the period
  //   - byCategory: [{ categoryId, name, total }] ordered by total DESC
  //   - byMonth: [{ month: 'YYYY-MM', total }] for the period (year only meaningful for year)
  //   - range: { from, to }
  app.get('/api/dashboard', { preHandler: requireAuth }, async (req, reply) => {
    const q = querySchema.parse(req.query);
    const range = rangeForPeriod(q.period);

    const totalRes = await app.pg.query(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
         FROM expenses
        WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3`,
      [req.userId, range.from, range.to],
    );

    const byCatRes = await app.pg.query(
      `SELECT c.id   AS "categoryId",
              c.name AS name,
              COALESCE(SUM(e.amount), 0)::text AS total
         FROM categories c
         LEFT JOIN expenses e
           ON e.category_id = c.id
          AND e.user_id     = $1
          AND e.expense_date BETWEEN $2 AND $3
        GROUP BY c.id, c.name
        ORDER BY SUM(COALESCE(e.amount, 0)) DESC`,
      [req.userId, range.from, range.to],
    );

    const byMonthRes = await app.pg.query(
      `SELECT to_char(expense_date, 'YYYY-MM') AS month,
              COALESCE(SUM(amount), 0)::text AS total
         FROM expenses
        WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
        GROUP BY to_char(expense_date, 'YYYY-MM')
        ORDER BY month ASC`,
      [req.userId, range.from, range.to],
    );

    return reply.send({
      period: q.period,
      range,
      total: Number(totalRes.rows[0].total),
      byCategory: byCatRes.rows.map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        total: Number(r.total),
      })),
      byMonth: byMonthRes.rows.map((r) => ({ month: r.month, total: Number(r.total) })),
    });
  });
}