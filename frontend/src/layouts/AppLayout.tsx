import { LogOut, User } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { psicologo, consultorioActivo, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Historia clinica psicologica</p>
          <h1>{consultorioActivo?.nombre ?? 'Sin consultorio activo'}</h1>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/pacientes">Pacientes</NavLink>
          {/* {consultorioActivo?.rol === 'ADMIN' && (
            <NavLink to="/admin/solicitudes">Solicitudes</NavLink>
          )} */}
          {/* <NavLink to="/consultorios">Cambiar consultorio</NavLink> */}
        </nav>
        <div className="app-user">
          <User size={16} />
          <Link to="/perfil">{psicologo?.nombre || psicologo?.email}</Link>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
