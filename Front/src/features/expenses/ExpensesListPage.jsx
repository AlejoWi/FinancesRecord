import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { CATEGORY_BY_ID } from '../../db/categories.js';
// NOTE: src/db/categories.js will be DELETED in commit 8. Keep the
// import here for now (commit 5 is a refactor, not a delete). The
// next page rewrites (commits 6, 7) also keep it. The deletion in
// commit 8 makes all these imports fail, which is intended — by then
// every page should have been rewired to use the API's category list.

function formatAmount(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

function formatDate(iso) {
  // expenseDate is YYYY-MM-DD; display in es-AR locale without timezone shift.
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ExpensesListPage() {
  const [expenses, setExpenses] = useState([]);
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
    api
      .get(`/api/expenses${qs ? `?${qs}` : ''}`)
      .then((data) => {
        if (!cancelled) setExpenses(data.expenses);
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
            {Object.values(CATEGORY_BY_ID).map((c) => (
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

      {error && <p className="form__error">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : expenses.length === 0 ? (
        <p>No hay gastos para los filtros seleccionados.</p>
      ) : (
        <>
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
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.expenseDate)}</td>
                  <td>{CATEGORY_BY_ID[e.categoryId]?.name ?? 'Desconocida'}</td>
                  <td>{e.description || '—'}</td>
                  <td className="num">{formatAmount(Number(e.amount))}</td>
                  <td className="actions">
                    <Link to={`/expenses/${e.id}`}>Editar</Link>
                    <button type="button" onClick={() => onDelete(e.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <td className="num">{formatAmount(totalShown)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
