/**
 * Local persistence layer.
 *
 * The frontend cannot safely talk to PostgreSQL directly (credentials would
 * leak via the bundle). Until a backend API exists, we persist users and
 * expenses in localStorage. The SQL scripts in `/db` describe the eventual
 * shape of this data on the server side.
 */

const USERS_KEY = 'fr.users';
const EXPENSES_KEY = 'fr.expenses';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback (unlikely needed in modern browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- Users ----------

export function getAllUsers() {
  return read(USERS_KEY, []);
}

export function findUserByEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  return getAllUsers().find((u) => u.email === normalized) ?? null;
}

export function createUser({ name, email, passwordHash }) {
  const users = getAllUsers();
  const now = new Date().toISOString();
  const user = {
    id: uuid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  };
  users.push(user);
  write(USERS_KEY, users);
  return user;
}

// ---------- Expenses ----------

export function getAllExpenses() {
  return read(EXPENSES_KEY, []);
}

export function getUserExpenses(userId) {
  return getAllExpenses()
    .filter((e) => e.user_id === userId)
    .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1));
}

export function getExpenseById(id) {
  return getAllExpenses().find((e) => e.id === id) ?? null;
}

export function createExpense({ userId, categoryId, amount, description, expenseDate }) {
  const all = getAllExpenses();
  const now = new Date().toISOString();
  const expense = {
    id: uuid(),
    user_id: userId,
    category_id: categoryId,
    amount: Number(amount),
    description: description ?? null,
    expense_date: expenseDate,
    created_at: now,
    updated_at: now,
  };
  all.push(expense);
  write(EXPENSES_KEY, all);
  return expense;
}

export function updateExpense(id, userId, patch) {
  const all = getAllExpenses();
  const idx = all.findIndex((e) => e.id === id && e.user_id === userId);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  write(EXPENSES_KEY, all);
  return all[idx];
}

export function deleteExpense(id, userId) {
  const all = getAllExpenses();
  const next = all.filter((e) => !(e.id === id && e.user_id === userId));
  const removed = next.length !== all.length;
  if (removed) write(EXPENSES_KEY, next);
  return removed;
}
