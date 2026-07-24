import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function NuevoPaciente() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', email: '', telefono: '',
    direccion: '', fechaNacimiento: '', motivoConsulta: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/pacientes', form);
      navigate(`/pacientes/${res.data.id}`);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map((e) => e.msg).join(', ') : (err.response?.data?.error || 'Error al crear paciente'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/pacientes" className="text-muted">← Pacientes</Link>
          <h1 style={{ marginTop: '.25rem' }}>Nuevo paciente</h1>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 680 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>Apellido *</label>
              <input name="apellido" value={form.apellido} onChange={handleChange} required />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>DNI</label>
              <input name="dni" value={form.dni} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>Fecha de nacimiento</label>
              <input type="date" name="fechaNacimiento" value={form.fechaNacimiento} onChange={handleChange} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Motivo de consulta</label>
            <textarea name="motivoConsulta" value={form.motivoConsulta} onChange={handleChange} />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Guardando…' : 'Crear paciente'}</button>
            <Link to="/pacientes" className="btn btn-secondary">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
