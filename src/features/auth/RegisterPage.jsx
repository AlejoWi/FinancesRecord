import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../../validations/auth.js';
import { useSession } from '../../store/SessionContext.jsx';

export function RegisterPage() {
  const { register: registerUser } = useSession();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values) {
    setSubmitError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'No se pudo registrar');
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1>Crear cuenta</h1>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" type="text" autoComplete="name" {...register('name')} />
            {errors.name && <p className="field__error">{errors.name.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="field__error">{errors.email.message}</p>}
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="field__error">{errors.password.message}</p>}
          </div>
          {submitError && <p className="form__error">{submitError}</p>}
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Registrarme'}
          </button>
        </form>
        <p className="auth__alt">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
