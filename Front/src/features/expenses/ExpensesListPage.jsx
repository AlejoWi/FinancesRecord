import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../store/SessionContext.jsx';
import { deleteExpense, getUserExpenses } from '../../db/localStore.js';
import { CATEGORIES, categoryName } from '../../db/categories.js';

function formatCurrency(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

export function ExpensesListPage() {
  const { user } = useSession();
  const [version, setVersion] = useState(0); // refresh after delete
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const expenses = useMemo(() => getUserExpenses(user.id), [user.id, version]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== 'all' && String(e.category_id) !== String(categoryFilter)) return false;
      if (from && e.expense_date < from) return false;
      if (to && e.expense_date > to) return false;
      return true;
    });
  }, [expenses, categoryFilter, from, to]);

  function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    deleteExpense(id, user.id);
    setVersion((v) => v + 1);
  }

  function clearFilters() {
    setCategoryFilter('all');
    setFrom('');
    setTo('');
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1>Gastos</h1>
        <Link to="/expenses/new" className="btn btn--primary">+ Nuevo gasto</Link>
      </header>

      <div className="filters">
        <div className="field">
          <label htmlFor="cat">Categoría</label>
          <select id="cat" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">Desde</label>
          <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="to">Hasta</label>
          <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" className="btn btn--ghost" onClick={clearFilters}>Limpiar</button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No hay gastos para los filtros seleccionados.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th className="num">Monto</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{e.expense_date}</td>
                  <td>{categoryName(e.category_id)}</td>
                  <td>{e.description || '—'}</td>
                  <td className="num">{formatCurrency(e.amount)}</td>
                  <td className="row-actions">
                    <Link to={`/expenses/${e.id}`} className="btn btn--ghost btn--sm">Editar</Link>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDelete(e.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
