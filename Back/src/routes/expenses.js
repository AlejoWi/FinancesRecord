import { makeRequireAuth } from '../auth/middleware.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
} from '../schemas/expense.js';
import { ApiError } from '../errors.js';

// Shape returned to the client. The DB column `expense_date` becomes
// `expenseDate` (camelCase) and `category_id` becomes `categoryId`.
function publicExpense(row) {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    amount: Number(row.amount), // NUMERIC -> string in pg; coerce to number
    description: row.description,
    expenseDate: row.expense_date, // already a YYYY-MM-DD string from pg DATE
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Validate that the category exists. Returns the row, or null.
async function findCategory(pg, categoryId) {
  const { rows } = await pg.query(`SELECT id FROM categories WHERE id = $1`, [categoryId]);
  return rows[0] ?? null;
}

export async function expenseRoutes(app) {
  const requireAuth = makeRequireAuth(app.pg);

  // GET /api/expenses?categoryId=&from=&to=&limit=&offset=
  app.get('/api/expenses', { preHandler: requireAuth }, async (req, reply) => {
    const q = listExpensesQuerySchema.parse(req.query);
    const params = [req.userId];
    let where = `user_id = $1`;
    if (q.categoryId) {
      params.push(q.categoryId);
      where += ` AND category_id = $${params.length}`;
    }
    if (q.from) {
      params.push(q.from);
      where += ` AND expense_date >= $${params.length}`;
    }
    if (q.to) {
      params.push(q.to);
      where += ` AND expense_date <= $${params.length}`;
    }
    params.push(q.limit, q.offset);
    const { rows } = await app.pg.query(
      `SELECT id, user_id, category_id, amount, description, expense_date, created_at, updated_at
         FROM expenses
        WHERE ${where}
        ORDER BY expense_date DESC, created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return reply.send({ expenses: rows.map(publicExpense) });
  });

  // GET /api/expenses/:id
  // Cross-user access returns 404 (NOT 403, NOT 200). The WHERE filter
  // is the only authorization boundary; the frontend redirect is UX,
  // not security.
  app.get('/api/expenses/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { rows } = await app.pg.query(
      `SELECT id, user_id, category_id, amount, description, expense_date, created_at, updated_at
         FROM expenses
        WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId],
    );
    if (rows.length === 0) {
      throw new ApiError({ code: 'NOT_FOUND', message: 'Expense not found', statusCode: 404 });
    }
    return reply.send({ expense: publicExpense(rows[0]) });
  });

  // POST /api/expenses
  app.post('/api/expenses', { preHandler: requireAuth }, async (req, reply) => {
    const body = createExpenseSchema.parse(req.body);
    if (!(await findCategory(app.pg, body.categoryId))) {
      throw new ApiError({ code: 'UNKNOWN_CATEGORY', message: 'Category does not exist', statusCode: 400 });
    }
    const { rows } = await app.pg.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, expense_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, category_id, amount, description, expense_date, created_at, updated_at`,
      [req.userId, body.categoryId, body.amount, body.description, body.expenseDate],
    );
    return reply.code(201).send({ expense: publicExpense(rows[0]) });
  });

  // PATCH /api/expenses/:id
  app.patch('/api/expenses/:id', { preHandler: requireAuth }, async (req, reply) => {
    const body = updateExpenseSchema.parse(req.body);
    if (body.categoryId && !(await findCategory(app.pg, body.categoryId))) {
      throw new ApiError({ code: 'UNKNOWN_CATEGORY', message: 'Category does not exist', statusCode: 400 });
    }
    // Build dynamic SET clause. Each field bumps the $N counter.
    const sets = [];
    const params = [];
    function add(value, col) {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    }
    if (body.categoryId !== undefined) add(body.categoryId, 'category_id');
    if (body.amount !== undefined) add(body.amount, 'amount');
    if (body.description !== undefined) add(body.description, 'description');
    if (body.expenseDate !== undefined) add(body.expenseDate, 'expense_date');
    params.push(req.params.id, req.userId);
    const { rows } = await app.pg.query(
      `UPDATE expenses
          SET ${sets.join(', ')}
        WHERE id = $${params.length - 1} AND user_id = $${params.length}
        RETURNING id, user_id, category_id, amount, description, expense_date, created_at, updated_at`,
      params,
    );
    if (rows.length === 0) {
      throw new ApiError({ code: 'NOT_FOUND', message: 'Expense not found', statusCode: 404 });
    }
    return reply.send({ expense: publicExpense(rows[0]) });
  });

  // DELETE /api/expenses/:id
  app.delete('/api/expenses/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { rowCount } = await app.pg.query(
      `DELETE FROM expenses WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId],
    );
    if (rowCount === 0) {
      throw new ApiError({ code: 'NOT_FOUND', message: 'Expense not found', statusCode: 404 });
    }
    return reply.code(204).send();
  });
}