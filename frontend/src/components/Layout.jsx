import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }) {
  const { tenant, usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>🧠 HistClinic</p>
            <p className="text-muted" style={{ fontSize: '.8rem', marginTop: '.25rem' }}>{tenant?.nombre}</p>
          </div>
          <h2>Menú</h2>
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/pacientes">Pacientes</NavLink>
          <NavLink to="/sesiones">Sesiones</NavLink>
        </div>
        <div style={{ marginTop: 'auto', borderTop: '1px solid #4a5568', paddingTop: '1rem' }}>
          <p style={{ fontSize: '.85rem', color: '#a0aec0', marginBottom: '.5rem' }}>
            {usuario?.nombre} {usuario?.apellido}
          </p>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
