import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client.js';

function formatAmount(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

const PERIODS = [
  { value: 'current_month', label: 'Este mes' },
  { value: 'previous_month', label: 'Mes anterior' },
  { value: 'year', label: 'Año' },
];

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

  if (error) return <p className="form__error">{error}</p>;

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
        <p>Cargando…</p>
      ) : (
        <>
          <p className="dashboard__total">
            Total: <strong>{formatAmount(data.total)}</strong>
            <span className="dashboard__range">
              {data.range.from} → {data.range.to}
            </span>
          </p>

          <h2>Por categoría</h2>
          {data.byCategory.length === 0 ? (
            <p>Sin gastos en el período.</p>
          ) : (
            <ul className="dashboard__categories">
              {data.byCategory.map((c) => (
                <li key={c.categoryId}>
                  <span className="dashboard__cat-name">{c.name}</span>
                  <span className="dashboard__cat-bar" style={{ width: `${(c.total / data.total) * 100}%` }} />
                  <span className="dashboard__cat-amount">{formatAmount(c.total)}</span>
                </li>
              ))}
            </ul>
          )}

          {data.byMonth.length > 0 && (
            <>
              <h2>Por mes</h2>
              <ul className="dashboard__months">
                {data.byMonth.map((m) => (
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
