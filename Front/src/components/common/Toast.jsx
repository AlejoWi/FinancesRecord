import { useEffect } from 'react';

// Single toast item. Auto-dismisses after `duration` ms (default 4000).
// Renders nothing when `visible` is false.
export function Toast({ id, message, kind = 'info', duration = 4000, onDismiss }) {
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(t);
  }, [id, duration, onDismiss]);

  if (!id) return null;
  return (
    <div className={`toast toast--${kind}`} role="status" aria-live="polite" onClick={() => onDismiss(id)}>
      <span className="toast__msg">{message}</span>
    </div>
  );
}
