import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError, createProceso, fetchProceso, updateProceso } from '../../api/client';
import type { EstadoProceso, ProcesoFormValues } from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';

const emptyForm: ProcesoFormValues = {
  fecha_vinculacion: '',
  motivo_consulta: '',
  aspectos_historia_vida: '',
  impresion_diagnostica: '',
  logros_significativos: '',
  cierre_proceso: '',
  recomendaciones: '',
  estado: 'ABIERTO',
};

export function ProcesoFormPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { pacienteId, procesoId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(procesoId);

  const [form, setForm] = useState<ProcesoFormValues>(emptyForm);
  const [pacienteDestino, setPacienteDestino] = useState<number | null>(
    pacienteId ? Number(pacienteId) : null,
  );
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit || !procesoId) return;
    let cancelled = false;
    fetchProceso(Number(procesoId), consultorioId)
      .then((data) => {
        if (cancelled) return;
        setPacienteDestino(data.paciente_id);
        setForm({
          fecha_vinculacion: data.fecha_vinculacion,
          motivo_consulta: data.motivo_consulta ?? '',
          aspectos_historia_vida: data.aspectos_historia_vida ?? '',
          impresion_diagnostica: data.impresion_diagnostica ?? '',
          logros_significativos: data.logros_significativos ?? '',
          cierre_proceso: data.cierre_proceso ?? '',
          recomendaciones: data.recomendaciones ?? '',
          estado: data.estado,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el proceso');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, procesoId, consultorioId]);

  function updateField<K extends keyof ProcesoFormValues>(field: K, value: ProcesoFormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        motivo_consulta: form.motivo_consulta || undefined,
        aspectos_historia_vida: form.aspectos_historia_vida || undefined,
        impresion_diagnostica: form.impresion_diagnostica || undefined,
        logros_significativos: form.logros_significativos || undefined,
        cierre_proceso: form.cierre_proceso || undefined,
        recomendaciones: form.recomendaciones || undefined,
      };
      if (isEdit && procesoId) {
        const updated = await updateProceso(Number(procesoId), payload, consultorioId);
        navigate(`/procesos/${updated.id}`, { replace: true });
      } else if (pacienteDestino) {
        const created = await createProceso(pacienteDestino, payload, consultorioId);
        navigate(`/procesos/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el proceso');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <section className="page-card">
      <h2>{isEdit ? 'Editar proceso' : 'Nuevo proceso'}</h2>
      <form className="entity-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <label>
          Fecha de vinculacion al proceso
          <input
            type="date"
            value={form.fecha_vinculacion}
            onChange={(e) => updateField('fecha_vinculacion', e.target.value)}
            required
          />
        </label>
        <label>
          Estado
          <select value={form.estado} onChange={(e) => updateField('estado', e.target.value as EstadoProceso)}>
            <option value="ABIERTO">Abierto</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </label>
        <label>
          Motivo de consulta
          <textarea
            value={form.motivo_consulta}
            onChange={(e) => updateField('motivo_consulta', e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Aspectos relevantes historia de vida
          <textarea
            value={form.aspectos_historia_vida}
            onChange={(e) => updateField('aspectos_historia_vida', e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Impresion diagnostica
          <textarea
            value={form.impresion_diagnostica}
            onChange={(e) => updateField('impresion_diagnostica', e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Logros significativos alcanzados durante el proceso
          <textarea
            value={form.logros_significativos}
            onChange={(e) => updateField('logros_significativos', e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Cierre del proceso de atencion
          <textarea
            value={form.cierre_proceso}
            onChange={(e) => updateField('cierre_proceso', e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Recomendaciones del proceso
          <textarea
            value={form.recomendaciones}
            onChange={(e) => updateField('recomendaciones', e.target.value)}
            rows={3}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  );
}
