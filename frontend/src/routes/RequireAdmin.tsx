import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function RequireAdmin() {
  const { consultorioActivo } = useAuth();

  if (consultorioActivo?.rol !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}
