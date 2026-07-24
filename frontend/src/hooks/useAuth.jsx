import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedTenant = localStorage.getItem('tenant');
    const savedUsuario = localStorage.getItem('usuario');
    if (token && savedTenant && savedUsuario) {
      setTenant(JSON.parse(savedTenant));
      setUsuario(JSON.parse(savedUsuario));
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('tenantSlug', data.tenant.slug);
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setTenant(data.tenant);
    setUsuario(data.usuario);
  };

  const logout = () => {
    localStorage.clear();
    setTenant(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, tenant, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
