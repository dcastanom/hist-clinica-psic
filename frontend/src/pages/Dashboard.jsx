import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { tenant, usuario } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/pacientes?limit=1'),
      api.get('/sesiones?limit=1'),
      api.get('/sesiones?estado=PROGRAMADA&limit=5'),
    ]).then(([pacRes, sesRes, proxRes]) => {
      setStats({
        totalPacientes: pacRes.data.total,
        totalSesiones: sesRes.data.total,
        proximasSesiones: proxRes.data.data,
      });
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Bienvenido, {usuario?.nombre} 👋</h1>
        <span className="text-muted">{tenant?.nombre}</span>
      </div>

      <div className="flex gap-2 flex-wrap" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ flex: '1', minWidth: '160px' }}>
          <p className="text-muted">Pacientes</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#4299e1' }}>{stats?.totalPacientes ?? '…'}</p>
        </div>
        <div className="card" style={{ flex: '1', minWidth: '160px' }}>
          <p className="text-muted">Sesiones totales</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#48bb78' }}>{stats?.totalSesiones ?? '…'}</p>
        </div>
        <div className="card" style={{ flex: '1', minWidth: '160px' }}>
          <p className="text-muted">Sesiones programadas</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#ed8936' }}>{stats?.proximasSesiones?.length ?? '…'}</p>
        </div>
      </div>

      {stats?.proximasSesiones?.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Próximas sesiones</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Fecha</th>
                  <th>Modalidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.proximasSesiones.map((s) => (
                  <tr key={s.id}>
                    <td>{s.paciente?.apellido}, {s.paciente?.nombre}</td>
                    <td>{new Date(s.fecha).toLocaleString('es-AR')}</td>
                    <td><span className={`badge ${s.modalidad === 'VIRTUAL' ? 'badge-blue' : 'badge-green'}`}>{s.modalidad}</span></td>
                    <td><Link to={`/sesiones/${s.id}`} className="btn btn-sm btn-secondary">Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mt-2">
        <Link to="/pacientes/nuevo" className="btn btn-primary">+ Nuevo paciente</Link>
        <Link to="/sesiones/nueva" className="btn btn-success">+ Nueva sesión</Link>
      </div>
    </div>
  );
}
