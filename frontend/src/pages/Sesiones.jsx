import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ESTADOS_BADGE = {
  PROGRAMADA: 'badge-blue',
  REALIZADA: 'badge-green',
  CANCELADA: 'badge-gray',
  NO_ASISTIO: 'badge-red',
};

export default function Sesiones() {
  const [sesiones, setSesiones] = useState([]);
  const [total, setTotal] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSesiones = async (estado = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/sesiones?${estado ? `estado=${estado}&` : ''}limit=50`);
      setSesiones(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSesiones(filtroEstado); }, [filtroEstado]);

  return (
    <div>
      <div className="page-header">
        <h1>Sesiones ({total})</h1>
        <Link to="/sesiones/nueva" className="btn btn-success">+ Nueva sesión</Link>
      </div>
      <div className="card">
        <div className="form-group" style={{ maxWidth: 220, marginBottom: '1rem' }}>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="REALIZADA">Realizada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="NO_ASISTIO">No asistió</option>
          </select>
        </div>
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : sesiones.length === 0 ? (
          <div className="empty-state">
            <p>No hay sesiones</p>
            <Link to="/sesiones/nueva" className="btn btn-success mt-2">Crear sesión</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Psicólogo</th>
                  <th>Modalidad</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.fecha).toLocaleString('es-AR')}</td>
                    <td>
                      <Link to={`/pacientes/${s.paciente?.id}`} style={{ color: '#4299e1' }}>
                        {s.paciente?.apellido}, {s.paciente?.nombre}
                      </Link>
                    </td>
                    <td>{s.usuario?.nombre} {s.usuario?.apellido}</td>
                    <td><span className={`badge ${s.modalidad === 'VIRTUAL' ? 'badge-blue' : 'badge-green'}`}>{s.modalidad}</span></td>
                    <td><span className={`badge ${ESTADOS_BADGE[s.estado] || 'badge-gray'}`}>{s.estado}</span></td>
                    <td><Link to={`/sesiones/${s.id}`} className="btn btn-sm btn-secondary">Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
