import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ESTADOS = ['PROGRAMADA', 'REALIZADA', 'CANCELADA', 'NO_ASISTIO'];

export default function SesionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sesion, setSesion] = useState(null);
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);

  const fetchSesion = useCallback(() =>
    api.get(`/sesiones/${id}`).then((res) => {
      setSesion(res.data);
      setNotas(res.data.notasClinicas || []);
    }).catch(() => navigate('/sesiones')),
  [id, navigate]);

  useEffect(() => { fetchSesion(); }, [fetchSesion]);

  const handleCambiarEstado = async (estado) => {
    setUpdatingEstado(true);
    try {
      const res = await api.patch(`/sesiones/${id}`, { estado });
      setSesion({ ...sesion, estado: res.data.estado });
    } finally {
      setUpdatingEstado(false);
    }
  };

  const handleAgregarNota = async (e) => {
    e.preventDefault();
    if (!nuevaNota.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/notas', { sesionId: id, contenido: nuevaNota, etiquetas });
      setNotas([...notas, res.data]);
      setNuevaNota('');
      setEtiquetas('');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarNota = async (notaId) => {
    if (!window.confirm('¿Eliminar esta nota?')) return;
    await api.delete(`/notas/${notaId}`);
    setNotas(notas.filter((n) => n.id !== notaId));
  };

  if (!sesion) return <p className="text-muted">Cargando…</p>;

  const ESTADOS_BADGE = {
    PROGRAMADA: 'badge-blue',
    REALIZADA: 'badge-green',
    CANCELADA: 'badge-gray',
    NO_ASISTIO: 'badge-red',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/sesiones" className="text-muted">← Sesiones</Link>
          <h1 style={{ marginTop: '.25rem' }}>
            Sesión con{' '}
            <Link to={`/pacientes/${sesion.paciente?.id}`} style={{ color: '#4299e1' }}>
              {sesion.paciente?.apellido}, {sesion.paciente?.nombre}
            </Link>
          </h1>
          <p className="text-muted">{new Date(sesion.fecha).toLocaleString('es-AR')} · {sesion.duracion} min · {sesion.modalidad}</p>
        </div>
        <span className={`badge ${ESTADOS_BADGE[sesion.estado] || 'badge-gray'}`} style={{ fontSize: '1rem', padding: '.3rem .8rem' }}>
          {sesion.estado}
        </span>
      </div>

      {/* Estado actions */}
      <div className="card">
        <p style={{ marginBottom: '.75rem', fontWeight: 600 }}>Cambiar estado</p>
        <div className="flex gap-2 flex-wrap">
          {ESTADOS.filter((e) => e !== sesion.estado).map((estado) => (
            <button key={estado} className="btn btn-secondary btn-sm" disabled={updatingEstado} onClick={() => handleCambiarEstado(estado)}>
              {estado}
            </button>
          ))}
        </div>
        {sesion.observacion && (
          <div className="mt-2">
            <p className="text-muted">Observación</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{sesion.observacion}</p>
          </div>
        )}
      </div>

      {/* Clinical notes */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Historia clínica ({notas.length})</h2>

        {notas.length === 0 ? (
          <p className="text-muted" style={{ marginBottom: '1rem' }}>Sin notas clínicas para esta sesión.</p>
        ) : (
          notas.map((nota) => (
            <div key={nota.id} style={{ borderLeft: '3px solid #4299e1', paddingLeft: '1rem', marginBottom: '1rem' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{nota.contenido}</p>
              {nota.etiquetas && (
                <div className="flex gap-2 flex-wrap mt-1">
                  {nota.etiquetas.split(',').map((t) => (
                    <span key={t} className="badge badge-blue">{t.trim()}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted">{new Date(nota.createdAt).toLocaleString('es-AR')}</span>
                <button className="btn btn-sm btn-danger" onClick={() => handleEliminarNota(nota.id)}>Eliminar</button>
              </div>
            </div>
          ))
        )}

        <form onSubmit={handleAgregarNota} style={{ marginTop: '1rem', borderTop: '1px solid #edf2f7', paddingTop: '1rem' }}>
          <div className="form-group">
            <label>Nueva nota clínica</label>
            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Observaciones, intervenciones, evolución del paciente…"
              required
            />
          </div>
          <div className="form-group">
            <label>Etiquetas (separadas por coma)</label>
            <input
              value={etiquetas}
              onChange={(e) => setEtiquetas(e.target.value)}
              placeholder="ansiedad, terapia cognitiva, seguimiento"
            />
          </div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Agregar nota'}</button>
        </form>
      </div>
    </div>
  );
}
