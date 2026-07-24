import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError, deletePaciente, fetchPaciente, fetchProcesos } from '../../api/client';
import type { PacienteResponse, ProcesoResponse } from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';

const ESTADO_PROCESO_LABEL: Record<string, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
};

export function PacienteDetailPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const id = Number(pacienteId);

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [procesos, setProcesos] = useState<ProcesoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pacienteData, procesosData] = await Promise.all([
        fetchPaciente(id, consultorioId),
        fetchProcesos(id, consultorioId),
      ]);
      setPaciente(pacienteData);
      setProcesos(procesosData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el paciente');
    } finally {
      setLoading(false);
    }
  }, [id, consultorioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!paciente) return;
    if (!window.confirm(`¿Desactivar a ${paciente.nombre}? Ya no aparecera en el listado.`)) return;
    try {
      await deletePaciente(paciente.id, consultorioId);
      navigate('/pacientes', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo desactivar el paciente');
    }
  }

  if (loading) return <PageLoader />;
  if (error && !paciente) return <p className="form-error">{error}</p>;
  if (!paciente) return null;

  return (
    <div className="detail-stack">
      <section className="page-card">
        <div className="page-card-header">
          <h2>{paciente.nombre}</h2>
          <div className="page-card-actions">
            <Link to={`/pacientes/${paciente.id}/historia`} className="btn btn-ghost">
              <FileText size={16} />
              Historia clinica
            </Link>
            <Link to={`/pacientes/${paciente.id}/editar`} className="btn btn-ghost">
              <Pencil size={16} />
              Editar
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleDelete}>
              <Trash2 size={16} />
              Desactivar
            </button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <dl className="profile-grid">
          <dt>Documento</dt>
          <dd>{paciente.documento_identidad}</dd>
          <dt>Edad</dt>
          <dd>{paciente.edad ?? '-'}</dd>
          <dt>Fecha de nacimiento</dt>
          <dd>{formatDate(paciente.fecha_nacimiento)}</dd>
          <dt>Escolaridad</dt>
          <dd>{paciente.escolaridad ?? '-'}</dd>
          <dt>Direccion casa</dt>
          <dd>{paciente.direccion_casa ?? '-'}</dd>
          <dt>Telefono casa</dt>
          <dd>{paciente.telefono_casa ?? '-'}</dd>
          <dt>Telefono celular</dt>
          <dd>{paciente.telefono_celular ?? '-'}</dd>
          <dt>Email</dt>
          <dd>{paciente.email ?? '-'}</dd>
        </dl>
      </section>

      <section className="page-card">
        <div className="page-card-header">
          <h2>Procesos</h2>
          <Link to={`/pacientes/${paciente.id}/procesos/nuevo`} className="btn btn-primary">
            <Plus size={16} />
            Nuevo proceso
          </Link>
        </div>
        {procesos.length === 0 ? (
          <p>Este paciente aun no tiene procesos registrados.</p>
        ) : (
          <ul className="entity-list">
            {procesos.map((proceso) => (
              <li key={proceso.id} className="entity-item">
                <Link to={`/procesos/${proceso.id}`} className="entity-item-link">
                  <strong>Vinculado el {formatDate(proceso.fecha_vinculacion)}</strong>
                  <span>{proceso.motivo_consulta || 'Sin motivo de consulta registrado'}</span>
                  <span className="badge">{ESTADO_PROCESO_LABEL[proceso.estado]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
