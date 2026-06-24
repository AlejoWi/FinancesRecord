import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '../store/SessionContext.jsx';
import { Layout } from '../components/layout/Layout.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { ExpensesListPage } from '../features/expenses/ExpensesListPage.jsx';
import { ExpenseFormPage } from '../features/expenses/ExpenseFormPage.jsx';

function PrivateRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useSession();
  // Wait for the cookie check to finish before deciding. Avoids a /login
  // flash for users with a valid session cookie.
  if (bootstrapping) return <RouteFallback />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useSession();
  if (bootstrapping) return <RouteFallback />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function RouteFallback() {
  return (
    <div className="auth">
      <div className="auth__card"><p>Cargando…</p></div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/expenses" element={<ExpensesListPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage mode="create" />} />
        <Route path="/expenses/:id" element={<ExpenseFormPage mode="edit" />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
