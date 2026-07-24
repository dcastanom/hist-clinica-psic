import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError, createPaciente, fetchPaciente, updatePaciente } from '../../api/client';
import type { PacienteFormValues } from '../../api/types';
import { PageLoader } from '../../components/PageLoader';
import { useAuth } from '../../context/AuthContext';

const emptyForm: PacienteFormValues = {
  nombre: '',
  documento_identidad: '',
  fecha_nacimiento: '',
  escolaridad: '',
  direccion_casa: '',
  telefono_casa: '',
  telefono_celular: '',
  email: '',
};

export function PacienteFormPage() {
  const { consultorioActivo } = useAuth();
  const consultorioId = consultorioActivo!.consultorio_id;
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(pacienteId);

  const [form, setForm] = useState<PacienteFormValues>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit || !pacienteId) return;
    let cancelled = false;
    fetchPaciente(Number(pacienteId), consultorioId)
      .then((data) => {
        if (cancelled) return;
        setForm({
          nombre: data.nombre,
          documento_identidad: data.documento_identidad,
          fecha_nacimiento: data.fecha_nacimiento ?? '',
          escolaridad: data.escolaridad ?? '',
          direccion_casa: data.direccion_casa ?? '',
          telefono_casa: data.telefono_casa ?? '',
          telefono_celular: data.telefono_celular ?? '',
          email: data.email ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el paciente');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, pacienteId, consultorioId]);

  function updateField<K extends keyof PacienteFormValues>(field: K, value: PacienteFormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        escolaridad: form.escolaridad || undefined,
        direccion_casa: form.direccion_casa || undefined,
        telefono_casa: form.telefono_casa || undefined,
        telefono_celular: form.telefono_celular || undefined,
        email: form.email || undefined,
      };
      if (isEdit && pacienteId) {
        const updated = await updatePaciente(Number(pacienteId), payload, consultorioId);
        navigate(`/pacientes/${updated.id}`, { replace: true });
      } else {
        const created = await createPaciente(payload, consultorioId);
        navigate(`/pacientes/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el paciente');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <section className="page-card">
      <h2>{isEdit ? 'Editar paciente' : 'Nuevo paciente'}</h2>
      <form className="entity-form" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <label>
          Nombre de la persona vinculada
          <input value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} required />
        </label>
        <label>
          Documento de identidad
          <input
            value={form.documento_identidad}
            onChange={(e) => updateField('documento_identidad', e.target.value)}
            required
          />
        </label>
        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={form.fecha_nacimiento}
            onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
          />
        </label>
        <label>
          Escolaridad
          <input value={form.escolaridad} onChange={(e) => updateField('escolaridad', e.target.value)} />
        </label>
        <label>
          Direccion casa
          <input
            value={form.direccion_casa}
            onChange={(e) => updateField('direccion_casa', e.target.value)}
          />
        </label>
        <label>
          Telefono casa
          <input value={form.telefono_casa} onChange={(e) => updateField('telefono_casa', e.target.value)} />
        </label>
        <label>
          Telefono celular
          <input
            value={form.telefono_celular}
            onChange={(e) => updateField('telefono_celular', e.target.value)}
          />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
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
