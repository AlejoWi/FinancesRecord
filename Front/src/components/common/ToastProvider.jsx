import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Toast } from './Toast.jsx';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, opts = {}) => {
    const id = nextId++;
    const t = { id, message, kind: opts.kind || 'info', duration: opts.duration ?? 4000 };
    setToasts((cur) => [...cur, t]);
    return id;
  }, []);

  // Listen for the `fr:wiped` event dispatched by api/wipe.js when the
  // one-shot localStorage → backend migration runs on first login or
  // register. Fires the toast so the user knows their session is
  // linked to the backend.
  useEffect(() => {
    function onWiped(e) {
      const { hadUsers, hadExpenses } = e.detail || {};
      if (hadUsers || hadExpenses) {
        show('Tus datos anteriores se migraron al backend');
      } else {
        show('Sesión vinculada al backend');
      }
    }
    window.addEventListener('fr:wiped', onWiped);
    return () => window.removeEventListener('fr:wiped', onWiped);
  }, [show]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
