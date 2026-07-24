import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function NuevaSesion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pacientes, setPacientes] = useState([]);
  const [form, setForm] = useState({
    pacienteId: searchParams.get('pacienteId') || '',
    fecha: new Date().toISOString().slice(0, 16),
    duracion: 50,
    modalidad: 'PRESENCIAL',
    estado: 'PROGRAMADA',
    observacion: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/pacientes?activo=true&limit=200').then((res) => setPacientes(res.data.data));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/sesiones', { ...form, fecha: new Date(form.fecha).toISOString() });
      navigate(`/sesiones/${res.data.id}`);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map((e) => e.msg).join(', ') : (err.response?.data?.error || 'Error al crear sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/sesiones" className="text-muted">← Sesiones</Link>
          <h1 style={{ marginTop: '.25rem' }}>Nueva sesión</h1>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Paciente *</label>
            <select name="pacienteId" value={form.pacienteId} onChange={handleChange} required>
              <option value="">Seleccionar paciente…</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ flex: '2', minWidth: '200px' }}>
              <label>Fecha y hora *</label>
              <input type="datetime-local" name="fecha" value={form.fecha} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: '1', minWidth: '120px' }}>
              <label>Duración (min)</label>
              <input type="number" name="duracion" value={form.duracion} onChange={handleChange} min={1} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
              <label>Modalidad</label>
              <select name="modalidad" value={form.modalidad} onChange={handleChange}>
                <option value="PRESENCIAL">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
              <label>Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange}>
                <option value="PROGRAMADA">Programada</option>
                <option value="REALIZADA">Realizada</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="NO_ASISTIO">No asistió</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Observación inicial</label>
            <textarea name="observacion" value={form.observacion} onChange={handleChange} />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Guardando…' : 'Crear sesión'}</button>
            <Link to="/sesiones" className="btn btn-secondary">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
