import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema } from '../../validations/expense.js';
import { api, ApiError } from '../../api/client.js';
// NOTE: see ExpensesListPage for the import-during-deletion comment.

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitError, setSubmitError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: { categoryId: '', amount: '', description: '', expenseDate: todayISO() },
  });

  // Load categories (from API) and — in edit mode — the expense itself.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/categories')
      .then((data) => {
        if (cancelled) return;
        setCategories(data.categories);
      })
      .catch((err) => {
        if (cancelled) return;
        setSubmitError(err?.message || 'No se pudieron cargar las categorías');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/expenses/${id}`)
      .then((data) => {
        if (cancelled) return;
        const e = data.expense;
        reset({
          categoryId: String(e.categoryId),
          amount: String(e.amount),
          description: e.description || '',
          expenseDate: e.expenseDate,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = cross-user or doesn't exist; back to list
        if (err instanceof ApiError && err.status === 404) {
          navigate('/expenses', { replace: true });
          return;
        }
        setSubmitError(err?.message || 'No se pudo cargar el gasto');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isEdit, navigate, reset]);

  async function onSubmit(values) {
    setSubmitError(null);
    const payload = {
      categoryId: Number(values.categoryId),
      amount: Number(values.amount),
      description: values.description?.trim() ? values.description.trim() : null,
      expenseDate: values.expenseDate,
    };
    try {
      if (isEdit) {
        await api.patch(`/api/expenses/${id}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      navigate('/expenses', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/expenses', { replace: true });
        return;
      }
      if (err instanceof ApiError && err.status === 400 && err.code === 'VALIDATION_FAILED') {
        const first = err.issues?.[0];
        setSubmitError(first ? `${first.path?.join('.') || 'campo'}: ${first.message}` : 'Datos inválidos');
        return;
      }
      setSubmitError(err?.message || 'No se pudo guardar el gasto');
    }
  }

  async function onDelete() {
    if (!isEdit) return;
    if (!window.confirm('¿Eliminar este gasto?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/expenses/${id}`);
      navigate('/expenses', { replace: true });
    } catch (err) {
      setDeleting(false);
      setSubmitError(err?.message || 'No se pudo eliminar el gasto');
    }
  }

  const categoryOptions = useMemo(
    () => categories ?? [],
    [categories],
  );

  if (loading) return <p>Cargando…</p>;

  return (
    <div className="expense-form">
      <h1>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label htmlFor="categoryId">Categoría</label>
          <select id="categoryId" {...register('categoryId')}>
            <option value="">Seleccioná una categoría</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.categoryId && <p className="field__error">{errors.categoryId.message}</p>}
        </div>
        <div className="field">
          <label htmlFor="amount">Monto</label>
          <input id="amount" type="number" step="0.01" min="0.01" {...register('amount')} />
          {errors.amount && <p className="field__error">{errors.amount.message}</p>}
        </div>
        <div className="field">
          <label htmlFor="expenseDate">Fecha</label>
          <input id="expenseDate" type="date" {...register('expenseDate')} />
          {errors.expenseDate && <p className="field__error">{errors.expenseDate.message}</p>}
        </div>
        <div className="field">
          <label htmlFor="description">Descripción (opcional)</label>
          <input id="description" type="text" maxLength={255} {...register('description')} />
          {errors.description && <p className="field__error">{errors.description.message}</p>}
        </div>
        {submitError && <p className="form__error">{submitError}</p>}
        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear gasto'}
          </button>
          {isEdit && (
            <button type="button" className="btn btn--danger" onClick={onDelete} disabled={deleting}>
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
          <Link to="/expenses" className="btn btn--secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
