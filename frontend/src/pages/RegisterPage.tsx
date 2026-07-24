import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { ApiError, fetchConsultoriosPublicos, registerPsicologo } from '../api/client';
import type { ConsultorioPublicResponse } from '../api/types';
import { PageLoader } from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  email: '',
  password: '',
  consultorio_id: '',
  solicita_admin: false,
};

type FormState = typeof initialForm;

export function RegisterPage() {
  const { login, isAuthenticated, isBootstrapping } = useAuth();
  const navigate = useNavigate();
  const [consultorios, setConsultorios] = useState<ConsultorioPublicResponse[]>([]);
  const [loadingConsultorios, setLoadingConsultorios] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchConsultoriosPublicos()
      .then(setConsultorios)
      .catch(() => setError('No se pudieron cargar los consultorios'))
      .finally(() => setLoadingConsultorios(false));
  }, []);

  if (isBootstrapping) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/consultorios" replace />;

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.consultorio_id) {
      setError('Selecciona un consultorio');
      return;
    }
    setSubmitting(true);
    try {
      await registerPsicologo({
        email: form.email,
        password: form.password,
        consultorio_id: Number(form.consultorio_id),
        solicita_admin: form.solicita_admin,
      });
      await login(form.email, form.password);
      navigate('/consultorios', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Historia clinica psicologica</p>
        <h1>Registro de psicologo</h1>
        {error && <p className="form-error">{error}</p>}
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
          />
        </label>
        <label>
          Consultorio
          <select
            value={form.consultorio_id}
            onChange={(e) => updateField('consultorio_id', e.target.value)}
            required
            disabled={loadingConsultorios}
          >
            <option value="" disabled>
              {loadingConsultorios ? 'Cargando...' : 'Selecciona un consultorio'}
            </option>
            {consultorios.map((consultorio) => (
              <option key={consultorio.id} value={consultorio.id}>
                {consultorio.nombre} ({consultorio.nit})
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.solicita_admin}
            onChange={(e) => updateField('solicita_admin', e.target.checked)}
          />
          Solicito rol de administrador de este consultorio
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Registrarme'}
        </button>
        <p className="auth-alt">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </form>
    </div>
  );
}
