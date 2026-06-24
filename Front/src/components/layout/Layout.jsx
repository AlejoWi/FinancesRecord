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
        <Link to="/dashboard" className="layout__brand">FinancesRecord</Link>
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
