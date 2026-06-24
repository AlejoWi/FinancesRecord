import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client.js';
import { categoryColor } from '../../utils/categoryColor.js';

function formatAmount(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);
}

const PERIODS = [
  { value: 'current_month', label: 'Este mes' },
  { value: 'previous_month', label: 'Mes anterior' },
  { value: 'year', label: 'Año' },
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '.5rem .7rem',
        boxShadow: 'var(--shadow-md)',
        fontSize: '.85rem',
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{name}</div>
      <div style={{ color: 'var(--muted)' }}>{formatAmount(value)}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <span className="skeleton skeleton--block" style={{ height: 110 }} />
      <div className="cards">
        <span className="skeleton skeleton--block" />
        <span className="skeleton skeleton--block" />
        <span className="skeleton skeleton--block" />
        <span className="skeleton skeleton--block" />
      </div>
      <span className="skeleton skeleton--block" style={{ height: 260 }} />
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState('current_month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/api/dashboard?period=${period}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'No se pudo cargar el dashboard');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  if (error && !data) {
    return (
      <div className="dashboard">
        <div className="dashboard__header"><h1>Resumen</h1></div>
        <p className="form__error" role="alert">{error}</p>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const byCategory = data?.byCategory ?? [];
  const byMonth = data?.byMonth ?? [];
  const range = data?.range;

  const hasCategoryData = byCategory.some((c) => Number(c.total) > 0);
  const pieData = byCategory
    .filter((c) => Number(c.total) > 0)
    .map((c) => ({ name: c.name, value: Number(c.total), color: categoryColor(c.name) }));

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Resumen</h1>
        <div className="field">
          <label htmlFor="period">Período</label>
          <select id="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="card card--hero" aria-label="Total del período">
            <span className="card__title">Total del período</span>
            <p className="card__value">{formatAmount(total)}</p>
            {range && (
              <span className="card__sub">{range.from} → {range.to}</span>
            )}
          </section>

          <h2>Por categoría</h2>
          {byCategory.length === 0 ? (
            <div className="empty">
              <span className="empty__icon" aria-hidden="true">📭</span>
              <p className="empty__title">Sin gastos en el período</p>
              <p className="empty__msg">Probá cambiar el período o registrá tu primer gasto.</p>
              <Link to="/expenses/new" className="btn btn--primary btn--sm">+ Nuevo gasto</Link>
            </div>
          ) : (
            <>
              <ul className="dashboard__categories">
                {byCategory.map((c) => {
                  const amount = Number(c.total) || 0;
                  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
                  const color = categoryColor(c.name);
                  return (
                    <li key={c.categoryId ?? c.name}>
                      <span className="dashboard__cat-name" style={{ color }}>{c.name}</span>
                      <span className="dashboard__cat-amount">{formatAmount(amount)}</span>
                      {amount > 0 && (
                        <span
                          className="dashboard__cat-bar"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>

              {hasCategoryData && (
                <div className="dashboard__chart-wrap">
                  <h2>Distribución por categoría</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={2}
                          stroke="var(--surface)"
                          strokeWidth={2}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          verticalAlign="middle"
                          align="right"
                          layout="vertical"
                          iconType="circle"
                          wrapperStyle={{ fontSize: '.85rem' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {byMonth.length > 0 && (
            <>
              <h2>Por mes</h2>
              <ul className="dashboard__months">
                {byMonth.map((m) => (
                  <li key={m.month}>
                    <span>{m.month}</span>
                    <strong>{formatAmount(m.total)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}