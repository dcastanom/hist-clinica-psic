import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function RequireConsultorioActivo() {
  const { consultorioActivo } = useAuth();

  if (!consultorioActivo) return <Navigate to="/consultorios" replace />;
  return <Outlet />;
}
