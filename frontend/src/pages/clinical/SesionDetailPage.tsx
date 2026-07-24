import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  ApiError,
  createCompromiso,
  deleteCompromiso,
  deleteSesion,
  fetchCompromisos,
  fetchSesion,
  updateCompromiso,
} from '../../api/client';
import type {
  CompromisoFormValues,
  CompromisoResponse,
  EstadoCompromiso,
  SesionResponse,
} from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

const ESTADO_LABEL: Record<EstadoCompromiso, string> = {
  PENDIENTE: 'Pendiente',
  EN_SEGUIMIENTO: 'En seguimiento',
  CUMPLIDO: 'Cumplido',
  NO_CUMPLIDO: 'No cumplido',
};

const emptyCompromiso: CompromisoFormValues = {
  descripcion: '',
  resultado_seguimiento: '',
  estado: 'PENDIENTE',
};

export function SesionDetailPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { sesionId } = useParams();
  const navigate = useNavigate();
  const id = Number(sesionId);

  const [sesion, setSesion] = useState<SesionResponse | null>(null);
  const [compromisos, setCompromisos] = useState<CompromisoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCompromiso, setNewCompromiso] = useState<CompromisoFormValues>(emptyCompromiso);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CompromisoFormValues>(emptyCompromiso);
  const [savingEditId, setSavingEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sesionData, compromisosData] = await Promise.all([
        fetchSesion(id, consultorioId),
        fetchCompromisos(id, consultorioId),
      ]);
      setSesion(sesionData);
      setCompromisos(compromisosData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la sesion');
    } finally {
      setLoading(false);
    }
  }, [id, consultorioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeleteSesion() {
    if (!sesion) return;
    if (!window.confirm('¿Eliminar esta sesion? Se eliminaran tambien sus compromisos.')) return;
    try {
      await deleteSesion(sesion.id, consultorioId);
      navigate(`/procesos/${sesion.proceso_id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la sesion');
    }
  }

  async function handleCreateCompromiso(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const created = await createCompromiso(
        id,
        { ...newCompromiso, resultado_seguimiento: newCompromiso.resultado_seguimiento || undefined },
        consultorioId,
      );
      setCompromisos((prev) => [...prev, created]);
      setNewCompromiso(emptyCompromiso);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el compromiso');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(compromiso: CompromisoResponse) {
    setEditingId(compromiso.id);
    setEditForm({
      descripcion: compromiso.descripcion,
      resultado_seguimiento: compromiso.resultado_seguimiento ?? '',
      estado: compromiso.estado,
    });
  }

  async function handleSaveEdit(compromisoId: number) {
    setSavingEditId(compromisoId);
    setError(null);
    try {
      const updated = await updateCompromiso(
        compromisoId,
        { ...editForm, resultado_seguimiento: editForm.resultado_seguimiento || undefined },
        consultorioId,
      );
      setCompromisos((prev) => prev.map((item) => (item.id === compromisoId ? updated : item)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el compromiso');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDeleteCompromiso(compromisoId: number) {
    if (!window.confirm('¿Eliminar este compromiso?')) return;
    try {
      await deleteCompromiso(compromisoId, consultorioId);
      setCompromisos((prev) => prev.filter((item) => item.id !== compromisoId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el compromiso');
    }
  }

  if (loading) return <PageLoader />;
  if (error && !sesion) return <p className="form-error">{error}</p>;
  if (!sesion) return null;

  return (
    <div className="detail-stack">
      <Link to={`/procesos/${sesion.proceso_id}`} className="back-link">
        <ArrowLeft size={16} />
        Volver al proceso
      </Link>

      <section className="page-card">
        <div className="page-card-header">
          <h2>Sesion #{sesion.numero_sesion}</h2>
          <div className="page-card-actions">
            <Link to={`/sesiones/${sesion.id}/editar`} className="btn btn-ghost">
              <Pencil size={16} />
              Editar
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleDeleteSesion}>
              <Trash2 size={16} />
              Eliminar
            </button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <p className="field-label">Fecha: {formatDate(sesion.fecha_sesion)}</p>
        <div className="text-block">
          <h3>Notas de la sesion</h3>
          <p>{sesion.notas_sesion || 'Sin notas registradas'}</p>
        </div>
      </section>

      <section className="page-card">
        <h2>Compromisos</h2>

        {compromisos.length === 0 && <p>Esta sesion aun no tiene compromisos registrados.</p>}

        <ul className="compromiso-list">
          {compromisos.map((compromiso) => (
            <li key={compromiso.id} className="compromiso-item">
              {editingId === compromiso.id ? (
                <div className="entity-form compromiso-edit-form">
                  <label>
                    Descripcion
                    <textarea
                      value={editForm.descripcion}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                      rows={2}
                    />
                  </label>
                  <label>
                    Resultado o seguimiento
                    <textarea
                      value={editForm.resultado_seguimiento}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, resultado_seguimiento: e.target.value }))
                      }
                      rows={2}
                    />
                  </label>
                  <label>
                    Estado
                    <select
                      value={editForm.estado}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, estado: e.target.value as EstadoCompromiso }))
                      }
                    >
                      {Object.entries(ESTADO_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={savingEditId === compromiso.id}
                      onClick={() => handleSaveEdit(compromiso.id)}
                    >
                      {savingEditId === compromiso.id ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="compromiso-info">
                    <p>{compromiso.descripcion}</p>
                    {compromiso.resultado_seguimiento && (
                      <p className="compromiso-resultado">{compromiso.resultado_seguimiento}</p>
                    )}
                    <span className="badge">{ESTADO_LABEL[compromiso.estado]}</span>
                  </div>
                  <div className="compromiso-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(compromiso)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleDeleteCompromiso(compromiso.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        <form className="entity-form compromiso-new-form" onSubmit={handleCreateCompromiso}>
          <h3>Nuevo compromiso</h3>
          <label>
            Descripcion del compromiso
            <textarea
              value={newCompromiso.descripcion}
              onChange={(e) => setNewCompromiso((prev) => ({ ...prev, descripcion: e.target.value }))}
              rows={2}
              required
            />
          </label>
          <label>
            Resultado o seguimiento
            <textarea
              value={newCompromiso.resultado_seguimiento}
              onChange={(e) =>
                setNewCompromiso((prev) => ({ ...prev, resultado_seguimiento: e.target.value }))
              }
              rows={2}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              <Plus size={16} />
              {creating ? 'Agregando...' : 'Agregar compromiso'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
