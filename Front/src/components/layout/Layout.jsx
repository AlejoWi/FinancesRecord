import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../../store/SessionContext.jsx';

export function Layout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/dashboard" className="layout__brand">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2V7Z" />
            <path d="M3 8v9a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
            <circle cx="17" cy="13" r="1.25" fill="currentColor" stroke="none" />
          </svg>
          <span>FinancesRecord</span>
        </Link>
        <nav className="layout__nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
          <NavLink to="/expenses" className={({ isActive }) => (isActive ? 'active' : '')}>Gastos</NavLink>
        </nav>
        <div className="layout__user">
          <span className="layout__user-name">{user?.name}</span>
          <button type="button" className="btn btn--ghost" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}