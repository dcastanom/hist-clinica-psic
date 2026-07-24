import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError, createSesion, fetchSesion, updateSesion } from '../../api/client';
import type { SesionFormValues } from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';

const emptyForm: SesionFormValues = {
  fecha_sesion: '',
  numero_sesion: 1,
  notas_sesion: '',
};

export function SesionFormPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { procesoId, sesionId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(sesionId);

  const [form, setForm] = useState<SesionFormValues>(emptyForm);
  const [procesoDestino, setProcesoDestino] = useState<number | null>(
    procesoId ? Number(procesoId) : null,
  );
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit || !sesionId) return;
    let cancelled = false;
    fetchSesion(Number(sesionId), consultorioId)
      .then((data) => {
        if (cancelled) return;
        setProcesoDestino(data.proceso_id);
        setForm({
          fecha_sesion: data.fecha_sesion,
          numero_sesion: data.numero_sesion,
          notas_sesion: data.notas_sesion ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar la sesion');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, sesionId, consultorioId]);

  function updateField<K extends keyof SesionFormValues>(field: K, value: SesionFormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = { ...form, notas_sesion: form.notas_sesion || undefined };
      if (isEdit && sesionId) {
        const updated = await updateSesion(Number(sesionId), payload, consultorioId);
        navigate(`/sesiones/${updated.id}`, { replace: true });
      } else if (procesoDestino) {
        const created = await createSesion(procesoDestino, payload, consultorioId);
        navigate(`/sesiones/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la sesion');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <section className="page-card">
      <h2>{isEdit ? 'Editar sesion' : 'Nueva sesion'}</h2>
      <form className="entity-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <label>
          Fecha de la sesion
          <input
            type="date"
            value={form.fecha_sesion}
            onChange={(e) => updateField('fecha_sesion', e.target.value)}
            required
          />
        </label>
        <label>
          Numero de la sesion
          <input
            type="number"
            min={1}
            value={form.numero_sesion}
            onChange={(e) => updateField('numero_sesion', Number(e.target.value))}
            required
          />
        </label>
        <label>
          Notas de la sesion
          <textarea
            value={form.notas_sesion}
            onChange={(e) => updateField('notas_sesion', e.target.value)}
            rows={5}
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
