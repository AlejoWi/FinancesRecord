import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { fetchCategories } from '../../api/categories.js';
import { categoryColor } from '../../utils/categoryColor.js';

function formatAmount(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);
}

function formatDate(iso) {
  if (!iso) return '—';
  // Backend sometimes returns full ISO timestamps (e.g. "2026-06-23T00:00:00.000Z").
  // Trim to YYYY-MM-DD so we never feed a UTC midnight into the es-AR formatter
  // (which would otherwise shift the day in non-UTC timezones).
  const dateOnly = typeof iso === 'string' && iso.includes('T') ? iso.slice(0, 10) : iso;
  const [y, m, d] = dateOnly.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function ExpensesSkeleton() {
  return (
    <div className="table-wrap" aria-busy="true" aria-live="polite">
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th className="num">Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((i) => (
            <tr key={i}>
              <td><span className="skeleton skeleton--line" style={{ width: 80 }} /></td>
              <td><span className="skeleton skeleton--line" style={{ width: 110 }} /></td>
              <td><span className="skeleton skeleton--line" style={{ width: 180 }} /></td>
              <td className="num"><span className="skeleton skeleton--line" style={{ width: 90 }} /></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExpensesListPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filterCategory) params.set('categoryId', filterCategory);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    const qs = params.toString();
    Promise.all([
      api.get(`/api/expenses${qs ? `?${qs}` : ''}`),
      fetchCategories(),
    ])
      .then(([expData, cats]) => {
        if (cancelled) return;
        setExpenses(expData.expenses);
        setCategories(cats);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // PrivateRoute already redirected, but be defensive.
          setError('No autorizado');
        } else {
          setError(err?.message || 'No se pudieron cargar los gastos');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterCategory, filterFrom, filterTo]);

  const totalShown = useMemo(
    () => expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0),
    [expenses],
  );

  function categoryNameFor(id) {
    return categories.find((c) => c.id === id)?.name ?? 'Desconocida';
  }

  async function onDelete(id) {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      setExpenses((cur) => cur.filter((e) => e.id !== id));
    } catch (err) {
      window.alert(err?.message || 'No se pudo eliminar el gasto');
    }
  }

  return (
    <div className="expenses">
      <div className="expenses__header">
        <h1>Gastos</h1>
        <Link to="/expenses/new" className="btn btn--primary">+ Nuevo gasto</Link>
      </div>

      <div className="expenses__filters">
        <div className="field">
          <label htmlFor="cat">Categoría</label>
          <select id="cat" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">Desde</label>
          <input id="from" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to">Hasta</label>
          <input id="to" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
      </div>

      {error && <p className="form__error" role="alert">{error}</p>}

      {loading ? (
        <ExpensesSkeleton />
      ) : expenses.length === 0 ? (
        <div className="empty">
          <span className="empty__icon" aria-hidden="true">📭</span>
          <p className="empty__title">No hay gastos para los filtros seleccionados</p>
          <p className="empty__msg">Ajustá los filtros o registrá tu primer gasto para empezar.</p>
          <Link to="/expenses/new" className="btn btn--primary btn--sm">Crear primer gasto</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="expenses__table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th className="num">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const catName = categoryNameFor(e.categoryId);
                const color = categoryColor(catName);
                return (
                  <tr key={e.id}>
                    <td>{formatDate(e.expenseDate)}</td>
                    <td>
                      <span
                        className="badge--category"
                        style={{ '--cat-color': color, '--cat-bg': `${color}22`, '--cat-border': `${color}55` }}
                      >
                        {catName}
                      </span>
                    </td>
                    <td>{e.description || '—'}</td>
                    <td className="num">{formatAmount(Number(e.amount))}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/expenses/${e.id}`} className="btn btn--sm btn--ghost">Editar</Link>
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => onDelete(e.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total ({expenses.length})</td>
                <td className="num">{formatAmount(totalShown)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}