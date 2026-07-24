import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError, deleteProceso, fetchProceso, fetchSesiones } from '../../api/client';
import type { ProcesoResponse, SesionResponse } from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

const ESTADO_LABEL: Record<string, string> = { ABIERTO: 'Abierto', CERRADO: 'Cerrado' };

const CAMPOS: { key: 'motivo_consulta' | 'aspectos_historia_vida' | 'impresion_diagnostica' | 'logros_significativos' | 'cierre_proceso' | 'recomendaciones'; label: string }[] = [
  { key: 'motivo_consulta', label: 'Motivo de consulta' },
  { key: 'aspectos_historia_vida', label: 'Aspectos relevantes historia de vida' },
  { key: 'impresion_diagnostica', label: 'Impresion diagnostica' },
  { key: 'logros_significativos', label: 'Logros significativos' },
  { key: 'cierre_proceso', label: 'Cierre del proceso' },
  { key: 'recomendaciones', label: 'Recomendaciones' },
];

export function ProcesoDetailPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { procesoId } = useParams();
  const navigate = useNavigate();
  const id = Number(procesoId);

  const [proceso, setProceso] = useState<ProcesoResponse | null>(null);
  const [sesiones, setSesiones] = useState<SesionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const procesoData = await fetchProceso(id, consultorioId);
      const sesionesData = await fetchSesiones(id, consultorioId);
      setProceso(procesoData);
      setSesiones(sesionesData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el proceso');
    } finally {
      setLoading(false);
    }
  }, [id, consultorioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!proceso) return;
    if (!window.confirm('¿Eliminar este proceso? Se eliminaran tambien sus sesiones y compromisos.')) return;
    try {
      await deleteProceso(proceso.id, consultorioId);
      navigate(`/pacientes/${proceso.paciente_id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el proceso');
    }
  }

  if (loading) return <PageLoader />;
  if (error && !proceso) return <p className="form-error">{error}</p>;
  if (!proceso) return null;

  return (
    <div className="detail-stack">
      <Link to={`/pacientes/${proceso.paciente_id}`} className="back-link">
        <ArrowLeft size={16} />
        Volver al paciente
      </Link>

      <section className="page-card">
        <div className="page-card-header">
          <h2>Proceso desde {formatDate(proceso.fecha_vinculacion)}</h2>
          <div className="page-card-actions">
            <span className="badge">{ESTADO_LABEL[proceso.estado]}</span>
            <Link to={`/procesos/${proceso.id}/editar`} className="btn btn-ghost">
              <Pencil size={16} />
              Editar
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleDelete}>
              <Trash2 size={16} />
              Eliminar
            </button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="text-block-list">
          {CAMPOS.map(({ key, label }) => (
            <div key={key} className="text-block">
              <h3>{label}</h3>
              <p>{proceso[key] || 'Sin informacion registrada'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-card">
        <div className="page-card-header">
          <h2>Sesiones</h2>
          <Link to={`/procesos/${proceso.id}/sesiones/nueva`} className="btn btn-primary">
            <Plus size={16} />
            Nueva sesion
          </Link>
        </div>
        {sesiones.length === 0 ? (
          <p>Este proceso aun no tiene sesiones registradas.</p>
        ) : (
          <ul className="entity-list">
            {sesiones.map((sesion) => (
              <li key={sesion.id} className="entity-item">
                <Link to={`/sesiones/${sesion.id}`} className="entity-item-link">
                  <strong>Sesion #{sesion.numero_sesion}</strong>
                  <span>{formatDate(sesion.fecha_sesion)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
