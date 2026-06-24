// One-shot migration from localStorage to the backend. Fires on the
// first successful login or register. After firing once, the legacy
// keys are removed and a marker is set so the wipe becomes a no-op
// for subsequent logins on the same origin.
//
// On every wipe (even when no legacy data was found) we dispatch a
// `fr:wiped` CustomEvent on `window` so the UI can show a toast.
// This is the spec'd behavior (R-WIPE-04) and the fix for the
// gatekeeper's rev 2 note about toast triggering on first wipe.

const USERS_KEY = 'fr.users';
const EXPENSES_KEY = 'fr.expenses';
const WIPE_MARKER_KEY = 'fr.wiped';

export function runWipeIfNeeded() {
  try {
    if (typeof localStorage === 'undefined') return { skipped: true };
    if (localStorage.getItem(WIPE_MARKER_KEY) === '1') return { skipped: true };

    const usersRaw = localStorage.getItem(USERS_KEY);
    const expensesRaw = localStorage.getItem(EXPENSES_KEY);
    const hadUsers = !!usersRaw;
    const hadExpenses = !!expensesRaw;

    if (hadUsers) localStorage.removeItem(USERS_KEY);
    if (hadExpenses) localStorage.removeItem(EXPENSES_KEY);
    localStorage.setItem(WIPE_MARKER_KEY, '1');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fr:wiped', { detail: { hadUsers, hadExpenses } }),
      );
    }
    return { hadUsers, hadExpenses };
  } catch {
    return { skipped: true };
  }
}

// Test helper: clear the wipe marker so the wipe can run again.
export function resetWipeMarker() {
  try {
    localStorage.removeItem(WIPE_MARKER_KEY);
  } catch {
    /* noop */
  }
}
