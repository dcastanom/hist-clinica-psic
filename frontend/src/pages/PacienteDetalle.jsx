import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ESTADOS_BADGE = {
  PROGRAMADA: 'badge-blue',
  REALIZADA: 'badge-green',
  CANCELADA: 'badge-gray',
  NO_ASISTIO: 'badge-red',
};

export default function PacienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/pacientes/${id}`).then((res) => {
      setPaciente(res.data);
      setForm({
        nombre: res.data.nombre,
        apellido: res.data.apellido,
        dni: res.data.dni || '',
        email: res.data.email || '',
        telefono: res.data.telefono || '',
        direccion: res.data.direccion || '',
        fechaNacimiento: res.data.fechaNacimiento ? res.data.fechaNacimiento.slice(0, 10) : '',
        motivoConsulta: res.data.motivoConsulta || '',
      });
    }).catch(() => navigate('/pacientes'));
  }, [id, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/pacientes/${id}`, form);
      setPaciente({ ...paciente, ...res.data });
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!paciente) return <p className="text-muted">Cargando…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/pacientes" className="text-muted">← Pacientes</Link>
          <h1 style={{ marginTop: '.25rem' }}>{paciente.apellido}, {paciente.nombre}</h1>
        </div>
        <div className="flex gap-2">
          {!editMode && <button className="btn btn-secondary" onClick={() => setEditMode(true)}>Editar</button>}
          <Link to={`/sesiones/nueva?pacienteId=${paciente.id}`} className="btn btn-success">+ Sesión</Link>
        </div>
      </div>

      {editMode ? (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Editar paciente</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="flex gap-2 flex-wrap">
              {[['nombre','Nombre'],['apellido','Apellido'],['dni','DNI'],['email','Email'],['telefono','Teléfono']].map(([field, label]) => (
                <div className="form-group" key={field} style={{ flex: '1', minWidth: '180px' }}>
                  <label>{label}</label>
                  <input name={field} value={form[field]} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })} />
                </div>
              ))}
              <div className="form-group" style={{ flex: '1', minWidth: '180px' }}>
                <label>Fecha de nacimiento</label>
                <input type="date" name="fechaNacimiento" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input name="direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Motivo de consulta</label>
              <textarea name="motivoConsulta" value={form.motivoConsulta} onChange={(e) => setForm({ ...form, motivoConsulta: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => setEditMode(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="flex gap-2 flex-wrap">
            {[
              ['DNI', paciente.dni],
              ['Email', paciente.email],
              ['Teléfono', paciente.telefono],
              ['Dirección', paciente.direccion],
              ['Fecha nac.', paciente.fechaNacimiento ? new Date(paciente.fechaNacimiento).toLocaleDateString('es-AR') : null],
            ].map(([label, val]) => val ? (
              <div key={label} style={{ minWidth: '180px', flex: '1' }}>
                <p className="text-muted">{label}</p>
                <p style={{ fontWeight: 500 }}>{val}</p>
              </div>
            ) : null)}
          </div>
          {paciente.motivoConsulta && (
            <div className="mt-2">
              <p className="text-muted">Motivo de consulta</p>
              <p style={{ marginTop: '.35rem', whiteSpace: 'pre-wrap' }}>{paciente.motivoConsulta}</p>
            </div>
          )}
        </div>
      )}

      <div className="card mt-2">
        <h2 style={{ marginBottom: '1rem' }}>Sesiones recientes</h2>
        {paciente.sesiones?.length === 0 ? (
          <p className="text-muted">Sin sesiones registradas</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Psicólogo</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {paciente.sesiones?.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.fecha).toLocaleString('es-AR')}</td>
                    <td>{s.usuario?.nombre} {s.usuario?.apellido}</td>
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
