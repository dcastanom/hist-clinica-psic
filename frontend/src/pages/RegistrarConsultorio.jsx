import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function RegistrarConsultorio() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tenantNombre: '',
    tenantSlug: '',
    nombre: '',
    apellido: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    // Auto-generate slug from nombre
    if (name === 'tenantNombre') {
      updates.tenantSlug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register-tenant', form);
      login(res.data);
      navigate('/');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map((e) => e.msg).join(', ') : (err.response?.data?.error || 'Error al registrar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>🧠 HistClinic</h1>
        <p className="subtitle">Crear nuevo consultorio</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre del consultorio</label>
            <input name="tenantNombre" value={form.tenantNombre} onChange={handleChange} placeholder="Consultorio Ejemplo" required />
          </div>
          <div className="form-group">
            <label>Slug (identificador único)</label>
            <input name="tenantSlug" value={form.tenantSlug} onChange={handleChange} placeholder="consultorio-ejemplo" required pattern="[a-z0-9-]+" />
            <span className="text-muted mt-1">Solo letras minúsculas, números y guiones</span>
          </div>
          <div className="form-group">
            <label>Tu nombre</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Apellido</label>
            <input name="apellido" value={form.apellido} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Contraseña (mínimo 8 caracteres)</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creando…' : 'Crear consultorio'}
          </button>
        </form>
        <p className="text-muted mt-2" style={{ textAlign: 'center' }}>
          ¿Ya tenés cuenta? <Link to="/login" style={{ color: '#4299e1' }}>Ingresar</Link>
        </p>
      </div>
    </div>
  );
}
