import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { runWipeIfNeeded } from '../api/wipe.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  // `bootstrapping` is true while we ask the backend whether the cookie
  // is still valid. Routes wait on this flag so a logged-in user does
  // not see a /login flash on page refresh.
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user } = await api.get('/api/auth/me');
        if (!cancelled) setUser(user);
      } catch (err) {
        // 401 is expected when not logged in. Anything else is logged.
        if (!(err instanceof ApiError) || err.status !== 401) {
          // eslint-disable-next-line no-console
          console.warn('session bootstrap failed:', err);
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    try {
      const { user } = await api.post('/api/auth/register', { name, email, password });
      runWipeIfNeeded(); // fire-and-forget; logs to console if localStorage is unavailable
      setUser(user);
      return user;
    } catch (err) {
      throw new Error(translateAuthError(err, 'No se pudo registrar'));
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    try {
      const { user } = await api.post('/api/auth/login', { email, password });
      runWipeIfNeeded(); // fire-and-forget; logs to console if localStorage is unavailable
      setUser(user);
      return user;
    } catch (err) {
      throw new Error(translateAuthError(err, 'No se pudo iniciar sesión'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch (err) {
      // Logout failures are non-fatal: clear local state regardless.
      // eslint-disable-next-line no-console
      console.warn('logout request failed:', err);
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, bootstrapping, register, login, logout }),
    [user, bootstrapping, register, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Map a backend ApiError code to a user-friendly Spanish string.
// The Login/Register pages display err.message verbatim.
function translateAuthError(err, fallback) {
  if (!(err instanceof ApiError)) return err?.message || fallback;
  switch (err.code) {
    case 'REGISTRATION_FAILED':
      return 'No fue posible completar el registro. Intentá nuevamente.';
    case 'LOGIN_FAILED':
      return 'Email o contraseña incorrectos';
    case 'VALIDATION_FAILED': {
      const first = err.issues?.[0];
      if (first) {
        const path = first.path?.join('.') || 'campo';
        return `${path}: ${first.message}`;
      }
      return 'Datos inválidos';
    }
    case 'NETWORK_ERROR':
      return 'No se pudo conectar con el servidor. Reintentá en un momento.';
    default:
      return fallback;
  }
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
