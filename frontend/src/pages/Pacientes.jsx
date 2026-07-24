import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPacientes = async (search = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/pacientes?q=${encodeURIComponent(search)}&limit=50`);
      setPacientes(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacientes(q);
  }, [q]);

  const handleDesactivar = async (id) => {
    if (!window.confirm('¿Desactivar este paciente?')) return;
    await api.delete(`/pacientes/${id}`);
    fetchPacientes(q);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pacientes ({total})</h1>
        <Link to="/pacientes/nuevo" className="btn btn-primary">+ Nuevo paciente</Link>
      </div>

      <div className="card">
        <div className="form-group search-bar" style={{ marginBottom: '1rem' }}>
          <input
            placeholder="Buscar por nombre, apellido, DNI o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : pacientes.length === 0 ? (
          <div className="empty-state">
            <p>No se encontraron pacientes</p>
            <Link to="/pacientes/nuevo" className="btn btn-primary mt-2">Agregar paciente</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Apellido, Nombre</th>
                  <th>DNI</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/pacientes/${p.id}`} style={{ color: '#4299e1', fontWeight: 600 }}>
                        {p.apellido}, {p.nombre}
                      </Link>
                    </td>
                    <td>{p.dni || '—'}</td>
                    <td>{p.email || '—'}</td>
                    <td>{p.telefono || '—'}</td>
                    <td>
                      <span className={`badge ${p.activo ? 'badge-green' : 'badge-gray'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/pacientes/${p.id}`)}>Ver</button>
                        {p.activo && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDesactivar(p.id)}>Desactivar</button>
                        )}
                      </div>
                    </td>
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
