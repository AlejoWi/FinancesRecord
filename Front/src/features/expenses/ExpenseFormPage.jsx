import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema } from '../../validations/expense.js';
import { CATEGORIES } from '../../db/categories.js';
import { createExpense, getExpenseById, updateExpense } from '../../db/localStore.js';
import { useSession } from '../../store/SessionContext.jsx';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ExpenseFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: '',
      category_id: CATEGORIES[0].id,
      description: '',
      expense_date: todayIso(),
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    const expense = getExpenseById(id);
    if (!expense || expense.user_id !== user.id) {
      // G08: never expose another user's expense
      navigate('/expenses', { replace: true });
      return;
    }
    reset({
      amount: expense.amount,
      category_id: expense.category_id,
      description: expense.description ?? '',
      expense_date: expense.expense_date,
    });
  }, [isEdit, id, user.id, navigate, reset]);

  async function onSubmit(values) {
    setSubmitError(null);
    try {
      if (isEdit) {
        const updated = updateExpense(id, user.id, {
          amount: values.amount,
          category_id: values.category_id,
          description: values.description ?? null,
          expense_date: values.expense_date,
        });
        if (!updated) throw new Error('No se pudo actualizar el gasto');
      } else {
        createExpense({
          userId: user.id,
          categoryId: values.category_id,
          amount: values.amount,
          description: values.description ?? null,
          expenseDate: values.expense_date,
        });
      }
      navigate('/expenses', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Error al guardar el gasto');
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</h1>
      </header>
      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <label htmlFor="amount">Monto</label>
          <input id="amount" type="number" step="0.01" min="0.01" {...register('amount')} />
          {errors.amount && <p className="field__error">{errors.amount.message}</p>}
        </div>

        <div className="field">
          <label htmlFor="category_id">Categoría</label>
          <select id="category_id" {...register('category_id')}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="field__error">{errors.category_id.message}</p>}
        </div>

        <div className="field">
          <label htmlFor="expense_date">Fecha</label>
          <input id="expense_date" type="date" max={todayIso()} {...register('expense_date')} />
          {errors.expense_date && <p className="field__error">{errors.expense_date.message}</p>}
        </div>

        <div className="field">
          <label htmlFor="description">Descripción (opcional)</label>
          <input id="description" type="text" maxLength={255} {...register('description')} />
          {errors.description && <p className="field__error">{errors.description.message}</p>}
        </div>

        {submitError && <p className="form__error">{submitError}</p>}

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/expenses')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  );
}
