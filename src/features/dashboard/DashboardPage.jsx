import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSession } from '../../store/SessionContext.jsx';
import { getUserExpenses } from '../../db/localStore.js';
import { CATEGORIES, categoryName } from '../../db/categories.js';

const PERIODS = [
  { id: 'current', label: 'Mes actual' },
  { id: 'previous', label: 'Mes anterior' },
  { id: 'year', label: 'Año' },
];

function formatCurrency(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

function periodRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'current') {
    return {
      from: new Date(y, m, 1),
      to: new Date(y, m + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === 'previous') {
    return {
      from: new Date(y, m - 1, 1),
      to: new Date(y, m, 0, 23, 59, 59, 999),
    };
  }
  // year
  return {
    from: new Date(y, 0, 1),
    to: new Date(y, 11, 31, 23, 59, 59, 999),
  };
}

function withinRange(dateIso, from, to) {
  const d = new Date(`${dateIso}T00:00:00`);
  return d >= from && d <= to;
}

export function DashboardPage() {
  const { user } = useSession();
  const [period, setPeriod] = useState('current');

  const { total, byCategory } = useMemo(() => {
    const { from, to } = periodRange(period);
    const all = getUserExpenses(user.id);
    const inRange = all.filter((e) => withinRange(e.expense_date, from, to));
    const t = inRange.reduce((acc, e) => acc + Number(e.amount), 0);
    const byCat = CATEGORIES.map((c) => ({
      category: c.name,
      total: inRange
        .filter((e) => e.category_id === c.id)
        .reduce((acc, e) => acc + Number(e.amount), 0),
    }));
    return { total: t, byCategory: byCat };
  }, [user.id, period]);

  return (
    <section className="page">
      <header className="page__header">
        <h1>Dashboard</h1>
        <div className="period-switch">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn ${period === p.id ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="cards">
        <article className="card">
          <h2 className="card__title">Total del período</h2>
          <p className="card__value">{formatCurrency(total)}</p>
        </article>
        {byCategory.map((c) => (
          <article key={c.category} className="card">
            <h2 className="card__title">{c.category}</h2>
            <p className="card__value">{formatCurrency(c.total)}</p>
          </article>
        ))}
      </div>

      <div className="chart">
        <h2>Gastos por categoría</h2>
        <div className="chart__inner">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
