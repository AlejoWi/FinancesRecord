import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createUser, findUserByEmail } from '../db/localStore.js';
import { hashPassword, verifyPassword } from '../features/auth/crypto.js';

const SESSION_KEY = 'fr.session';

const SessionContext = createContext(null);

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => readStoredSession());

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  const register = useCallback(async ({ name, email, password }) => {
    if (findUserByEmail(email)) {
      throw new Error('El email ya está en uso');
    }
    const passwordHash = await hashPassword(password);
    const created = createUser({ name, email, passwordHash });
    const publicUser = { id: created.id, name: created.name, email: created.email };
    setUser(publicUser);
    return publicUser;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const stored = findUserByEmail(email);
    if (!stored) throw new Error('Email o contraseña incorrectos');
    const ok = await verifyPassword(password, stored.password_hash);
    if (!ok) throw new Error('Email o contraseña incorrectos');
    const publicUser = { id: stored.id, name: stored.name, email: stored.email };
    setUser(publicUser);
    return publicUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, register, login, logout }),
    [user, register, login, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
