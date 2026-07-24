import { Navigate, Outlet } from 'react-router-dom';

import { PageLoader } from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';

export function RequireAuth() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
